
import { Band, User, UserRole, Item, Sale, BandMember, SaleItem, Project, Task, ProjectType } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

// --- HELPER FOR MOCK FALLBACK ---
const USE_MOCK = !isSupabaseConfigured();

// --- REAL BACKEND IMPLEMENTATION ---

export const ImageService = {
  upload: async (file: File): Promise<string | undefined> => {
    if (USE_MOCK) {
       return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
       });
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
        .from('images') 
        .upload(filePath, file);

        if (uploadError) {
            console.error("Image upload failed:", uploadError);
            return undefined; // Fail gracefully
        }

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (e) {
        console.error("Image upload exception:", e);
        return undefined;
    }
  }
};

export const AuthService = {
  register: async (name: string, email: string, password: string, avatarUrl?: string): Promise<User> => {
    if (USE_MOCK) return MockAuth.register(name, email, password, avatarUrl);

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
          data: { name, avatar_url: avatarUrl }
      }
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Ошибка создания пользователя");

    // Profile creation is handled by DB Trigger usually, but if session exists we can return safe user object
    return {
        id: authData.user.id,
        name: name,
        email: email,
        avatarUrl: avatarUrl,
        bandIds: []
    };
  },

  login: async (email: string, password: string): Promise<User> => {
    if (USE_MOCK) return MockAuth.login(email, password);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Пользователь не найден");

    // Fetch profile details
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

    return {
        id: data.user.id,
        name: profile?.name || data.user.user_metadata.name || 'User',
        email: data.user.email || '',
        avatarUrl: profile?.avatar_url || data.user.user_metadata.avatar_url,
        description: profile?.description,
        bandIds: []
    };
  },

  getCurrentUser: async (): Promise<User | null> => {
    if (USE_MOCK) return MockAuth.getCurrentUser();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

    return {
        id: session.user.id,
        name: profile?.name || session.user.user_metadata?.name || 'User',
        email: session.user.email || '',
        avatarUrl: profile?.avatar_url || session.user.user_metadata?.avatar_url,
        description: profile?.description,
        bandIds: []
    };
  },

  updateProfile: async (name: string, avatarUrl?: string, description?: string) => {
    if (USE_MOCK) return MockAuth.updateProfile(name, avatarUrl, description);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    // 1. Update Auth Metadata (Syncs name/avatar to the session/JWT immediately)
    const { error: authError } = await supabase.auth.updateUser({
        data: { 
            name: name,
            avatar_url: avatarUrl 
        }
    });
    
    if (authError) console.warn("Meta update warning:", authError.message);

    // 2. Upsert into Public Profiles table
    const updates: any = {
        id: user.id,
        name,
        // updated_at removed to avoid schema errors
    };
    if (avatarUrl) updates.avatar_url = avatarUrl;
    if (description !== undefined) updates.description = description;

    const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' });

    if (error) throw new Error(error.message);
  },

  logout: async () => {
    if (USE_MOCK) return MockAuth.logout();
    await supabase.auth.signOut();
  }
};

export const BandService = {
  getUserBands: async (user: User): Promise<Band[]> => {
    if (USE_MOCK) return MockBand.getUserBands(user);

    const { data: members, error } = await supabase
        .from('band_members')
        .select(`
            role,
            bands (
                id, name, description, image_url, join_code, payment_qr_url, payment_phone_number, payment_recipient_name, show_payment_qr, show_payment_phone
            )
        `)
        .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    if (!members) return [];

    const bands: Band[] = [];
    
    for (const m of members) {
        const b = m.bands as any;
        if (!b) continue;
        const fullBand = await BandService.getBand(b.id);
        if (fullBand) bands.push(fullBand);
    }

    return bands;
  },

  getUserProfileWithBands: async (userId: string): Promise<{ user: User, bands: {id: string, name: string, imageUrl?: string, role: UserRole}[] } | null> => {
     if (USE_MOCK) return MockBand.getUserProfileWithBands(userId);

     // 1. Get Profile
     const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
     if (profileError || !profile) return null;

     const userObj: User = {
         id: profile.id,
         name: profile.name,
         email: profile.email || '',
         avatarUrl: profile.avatar_url,
         description: profile.description,
         bandIds: []
     };

     // 2. Get Bands
     const { data: members, error: bandsError } = await supabase
        .from('band_members')
        .select(`
            role,
            bands (
                id, name, image_url
            )
        `)
        .eq('user_id', userId);
    
     const bands = (members || []).map((m: any) => ({
         id: m.bands.id,
         name: m.bands.name,
         imageUrl: m.bands.image_url,
         role: m.role
     }));

     return { user: userObj, bands };
  },

  getBand: async (bandId: string): Promise<Band | undefined> => {
    if (USE_MOCK) return MockBand.getBand(bandId);

    const { data: bandData, error: bandError } = await supabase.from('bands').select('*').eq('id', bandId).single();
    if (bandError || !bandData) return undefined;

    const { data: membersData } = await supabase
        .from('band_members')
        .select('role, profiles(*)')
        .eq('band_id', bandId);
    
    const members: BandMember[] = (membersData || []).map((m: any) => ({
        id: m.profiles?.id,
        name: m.profiles?.name || 'Unknown',
        email: m.profiles?.email,
        avatarUrl: m.profiles?.avatar_url,
        description: m.profiles?.description,
        bandIds: [],
        role: m.role as UserRole
    })).filter((m: any) => m.id);

    const { data: itemsData } = await supabase.from('items').select('*').eq('band_id', bandId);
    const inventory: Item[] = (itemsData || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        imageUrl: i.image_url,
        variants: i.variants
    }));

    const { data: salesData } = await supabase.from('sales').select('*').eq('band_id', bandId);
    const sales: Sale[] = (salesData || []).map((s: any) => ({
        id: s.id,
        items: s.items,
        total: s.total,
        timestamp: s.timestamp,
        sellerId: s.seller_id,
        sellerName: s.seller_name
    }));

    const { data: requestsData } = await supabase
        .from('band_requests')
        .select('profiles(*)')
        .eq('band_id', bandId);

    const pendingRequests: User[] = (requestsData || []).map((r: any) => ({
        id: r.profiles?.id,
        name: r.profiles?.name || 'Unknown',
        email: r.profiles?.email,
        avatarUrl: r.profiles?.avatar_url,
        description: r.profiles?.description,
        bandIds: []
    })).filter((r: any) => r.id);

    return {
        id: bandData.id,
        name: bandData.name,
        description: bandData.description,
        imageUrl: bandData.image_url,
        paymentQrUrl: (bandData as any).payment_qr_url,
        paymentPhoneNumber: (bandData as any).payment_phone_number,
        paymentRecipientName: (bandData as any).payment_recipient_name,
        showPaymentQr: (bandData as any).show_payment_qr ?? true,
        showPaymentPhone: (bandData as any).show_payment_phone ?? true,
        joinCode: bandData.join_code,
        members,
        inventory,
        sales,
        pendingRequests
    };
  },

  createBand: async (name: string, user: User, imageUrl?: string): Promise<Band> => {
    if (USE_MOCK) return MockBand.createBand(name, user, imageUrl);

    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data: band, error } = await supabase
        .from('bands')
        .insert([{ 
            name, 
            image_url: imageUrl, 
            join_code: joinCode,
            show_payment_qr: true,
            show_payment_phone: true
        }])
        .select()
        .single();
    
    if (error) throw new Error(error.message);

    const { error: memberError } = await supabase.from('band_members').insert([{
        band_id: band.id,
        user_id: user.id,
        role: UserRole.ADMIN
    }]);

    if (memberError) throw new Error(memberError.message);

    const fullBand = await BandService.getBand(band.id);
    if (!fullBand) throw new Error("Failed to load new band");
    return fullBand;
  },
  
  updateBandDetails: async (bandId: string, name: string, description?: string, imageUrl?: string, paymentQrUrl?: string, paymentPhoneNumber?: string, paymentRecipientName?: string, showPaymentQr?: boolean, showPaymentPhone?: boolean): Promise<void> => {
    if (USE_MOCK) return MockBand.updateBandDetails(bandId, name, description, imageUrl, paymentQrUrl, paymentPhoneNumber, paymentRecipientName, showPaymentQr, showPaymentPhone);
    
    const updatePayload: any = { 
        name,
        description,
        image_url: imageUrl,
        payment_qr_url: paymentQrUrl,
        payment_phone_number: paymentPhoneNumber,
        payment_recipient_name: paymentRecipientName,
        show_payment_qr: showPaymentQr,
        show_payment_phone: showPaymentPhone
    };

    const { error } = await supabase
      .from('bands')
      .update(updatePayload)
      .eq('id', bandId);

    if (error) throw new Error(error.message);
  },

  searchBands: async (query: string): Promise<Partial<Band>[]> => {
    if (USE_MOCK) return []; // Mock not implemented for search
    
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
      .from('bands')
      .select('id, name, image_url')
      .ilike('name', `%${query}%`)
      .limit(10);
    
    if (error) throw new Error(error.message);
    
    return data.map((b: any) => ({
      id: b.id,
      name: b.name,
      imageUrl: b.image_url
    }));
  },

  joinBand: async (bandId: string, user: User): Promise<boolean> => {
    if (USE_MOCK) return MockBand.joinBand(bandId, user);

    const { data: existing } = await supabase.from('band_members')
        .select('*').eq('band_id', bandId).eq('user_id', user.id);
    
    if (existing && existing.length > 0) throw new Error("Вы уже состоите в этой группе");

    const { data: req } = await supabase.from('band_requests')
        .select('*').eq('band_id', bandId).eq('user_id', user.id);
    
    if (req && req.length > 0) throw new Error("Заявка уже отправлена");

    const { error } = await supabase.from('band_requests').insert([{ band_id: bandId, user_id: user.id }]);
    if (error) throw new Error(error.message);
    
    return true;
  },

  approveRequest: async (bandId: string, userId: string) => {
    if (USE_MOCK) return MockBand.approveRequest(bandId, userId);

    // Default role: MEMBER (Продажник)
    const { error } = await supabase.from('band_members').insert([{
        band_id: bandId,
        user_id: userId,
        role: UserRole.MEMBER 
    }]);

    if (error) throw new Error(error.message);

    await supabase.from('band_requests').delete()
        .eq('band_id', bandId).eq('user_id', userId);
  },

  updateMemberRole: async (bandId: string, userId: string, role: UserRole) => {
    if (USE_MOCK) return MockBand.updateMemberRole(bandId, userId, role);

    const { error } = await supabase
      .from('band_members')
      .update({ role })
      .eq('band_id', bandId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },
  
  removeMember: async (bandId: string, userId: string) => {
    if (USE_MOCK) return MockBand.removeMember(bandId, userId);

    const { error } = await supabase
      .from('band_members')
      .delete()
      .eq('band_id', bandId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  recordSale: async (bandId: string, sale: Sale) => {
    if (USE_MOCK) return MockBand.recordSale(bandId, sale);

    const { error } = await supabase.from('sales').insert([{
        band_id: bandId,
        seller_id: sale.sellerId,
        seller_name: sale.sellerName,
        total: sale.total,
        items: sale.items,
        timestamp: sale.timestamp
    }]);

    if (error) throw new Error(error.message);

    const { data: bandItems } = await supabase.from('items').select('*').eq('band_id', bandId);
    if (!bandItems) return;

    for (const saleItem of sale.items) {
        const dbItem = bandItems.find((i: any) => i.id === saleItem.itemId);
        if (dbItem && dbItem.variants) {
            const variants = dbItem.variants as any[];
            const variantIdx = variants.findIndex((v: any) => v.label === saleItem.variantLabel);
            if (variantIdx !== -1) {
                variants[variantIdx].stock -= saleItem.quantity;
                await supabase.from('items').update({ variants: variants }).eq('id', dbItem.id);
            }
        }
    }
  },

  updateSale: async (bandId: string, originalSale: Sale, updatedSale: Sale) => {
    if (USE_MOCK) return MockBand.updateSale(bandId, originalSale, updatedSale);

    // 1. Revert original stock
    const { data: bandItems } = await supabase.from('items').select('*').eq('band_id', bandId);
    if (!bandItems) throw new Error("Inventory not found");

    for (const oldItem of originalSale.items) {
      const dbItem = bandItems.find((i: any) => i.id === oldItem.itemId);
      if (dbItem && dbItem.variants) {
         const variants = dbItem.variants as any[];
         const vIdx = variants.findIndex((v: any) => v.label === oldItem.variantLabel);
         if (vIdx !== -1) {
             variants[vIdx].stock += oldItem.quantity;
             await supabase.from('items').update({ variants: variants }).eq('id', dbItem.id);
         }
      }
    }

    // 2. Apply new stock
    const { data: refreshedItems } = await supabase.from('items').select('*').eq('band_id', bandId);
    if (!refreshedItems) throw new Error("Inventory error");

    for (const newItem of updatedSale.items) {
        const dbItem = refreshedItems.find((i: any) => i.id === newItem.itemId);
        if (dbItem && dbItem.variants) {
           const variants = dbItem.variants as any[];
           const vIdx = variants.findIndex((v: any) => v.label === newItem.variantLabel);
           if (vIdx !== -1) {
               variants[vIdx].stock -= newItem.quantity;
               await supabase.from('items').update({ variants: variants }).eq('id', dbItem.id);
           }
        }
    }

    // 3. Update Sale Record
    const { error } = await supabase
      .from('sales')
      .update({
          total: updatedSale.total,
          items: updatedSale.items
      })
      .eq('id', originalSale.id);

    if (error) throw new Error(error.message);
  },

  deleteSale: async (bandId: string, sale: Sale) => {
    if (USE_MOCK) return MockBand.deleteSale(bandId, sale);

    // 1. Revert stock
    const { data: bandItems } = await supabase.from('items').select('*').eq('band_id', bandId);
    if (bandItems) {
        for (const item of sale.items) {
            const dbItem = bandItems.find((i: any) => i.id === item.itemId);
            if (dbItem && dbItem.variants) {
                const variants = dbItem.variants as any[];
                const vIdx = variants.findIndex((v: any) => v.label === item.variantLabel);
                if (vIdx !== -1) {
                    variants[vIdx].stock += item.quantity;
                    await supabase.from('items').update({ variants: variants }).eq('id', dbItem.id);
                }
            }
        }
    }

    // 2. Delete Record
    const { error } = await supabase.from('sales').delete().eq('id', sale.id);
    if (error) throw new Error(error.message);
  },

  updateInventory: async (bandId: string, item: Item) => {
    if (USE_MOCK) return MockBand.updateInventory(bandId, item);
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isRealUuid = uuidRegex.test(item.id);

    const { error } = await supabase.from('items').upsert({
        id: isRealUuid ? item.id : undefined,
        band_id: bandId,
        name: item.name,
        price: item.price,
        image_url: item.imageUrl,
        variants: item.variants
    }, { onConflict: 'id' });
    
    if (error) throw new Error(error.message);
  },

  deleteItem: async (bandId: string, itemId: string) => {
    if (USE_MOCK) return MockBand.deleteItem(bandId, itemId);
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) return;

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId)
      .eq('band_id', bandId);

    if (error) throw new Error(error.message);
  }
};

export const ProjectService = {
  getProjects: async (bandId: string): Promise<Project[]> => {
    if (USE_MOCK) return []; 
    
    // Fetch Projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('band_id', bandId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!projects || projects.length === 0) return [];

    // Fetch Tasks for these projects
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .in('project_id', projects.map(p => p.id));
      
    if (taskError) throw new Error(taskError.message);

    // Map Tasks to Projects
    return projects.map((p: any) => ({
      id: p.id,
      bandId: p.band_id,
      title: p.title,
      type: p.type as ProjectType,
      status: p.status,
      createdAt: p.created_at,
      tasks: (tasks || [])
        .filter((t: any) => t.project_id === p.id)
        .map((t: any) => ({
          id: t.id,
          projectId: t.project_id,
          title: t.title,
          isCompleted: t.is_completed,
          linkUrl: t.link_url
        }))
        .sort((a: any, b: any) => {
           // Sort logic: Not completed first
           if (a.isCompleted === b.isCompleted) return 0;
           return a.isCompleted ? 1 : -1;
        })
    }));
  },

  createProject: async (bandId: string, title: string, type: ProjectType): Promise<void> => {
     if (USE_MOCK) return;
     const { error } = await supabase
       .from('projects')
       .insert([{ band_id: bandId, title, type, status: 'IN_PROGRESS' }]);
     if (error) throw new Error(error.message);
  },

  deleteProject: async (projectId: string): Promise<void> => {
      if (USE_MOCK) return;
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw new Error(error.message);
  },

  addTask: async (projectId: string, title: string): Promise<void> => {
      if (USE_MOCK) return;
      const { error } = await supabase
        .from('tasks')
        .insert([{ project_id: projectId, title, is_completed: false }]);
      if (error) throw new Error(error.message);
  },

  toggleTask: async (taskId: string, isCompleted: boolean): Promise<void> => {
      if (USE_MOCK) return;
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: isCompleted })
        .eq('id', taskId);
      if (error) throw new Error(error.message);
  },

  updateTaskLink: async (taskId: string, linkUrl: string | null): Promise<void> => {
      if (USE_MOCK) return;
      const { error } = await supabase
        .from('tasks')
        .update({ link_url: linkUrl })
        .eq('id', taskId);
      if (error) throw new Error(error.message);
  },
  
  deleteTask: async (taskId: string): Promise<void> => {
      if (USE_MOCK) return;
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw new Error(error.message);
  }
};


// --- LEGACY MOCK IMPLEMENTATION (UNCHANGED for brevity, assume similar structure) ---
const STORAGE_KEYS = {
  USER: 'bandmate_user_v3',
  USERS_DB: 'bandmate_users_db_v3',
  BANDS: 'bandmate_bands_v3',
};
const generateId = () => Math.random().toString(36).substring(2, 9);

const MockAuth = {
    register: async (name: string, email: string, password: string, avatarUrl?: string): Promise<User> => {
        await new Promise(r => setTimeout(r, 800));
        const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '[]');
        if (users.find(u => u.email === email)) throw new Error('Пользователь существует');
        const newUser: User = { id: generateId(), name, email, password, avatarUrl, bandIds: [] };
        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
        return newUser;
    },
    login: async (email: string, password: string): Promise<User> => {
        await new Promise(r => setTimeout(r, 800));
        const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '[]');
        const user = users.find(u => u.email === email);
        if (!user || user.password !== password) throw new Error('Неверные данные');
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        return user;
    },
    getCurrentUser: (): User | null => {
        const u = localStorage.getItem(STORAGE_KEYS.USER);
        return u ? JSON.parse(u) : null;
    },
    updateProfile: async (name: string, avatarUrl?: string, description?: string) => {
        const uStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (!uStr) return;
        const user: User = JSON.parse(uStr);
        user.name = name;
        if (avatarUrl) user.avatarUrl = avatarUrl;
        if (description !== undefined) user.description = description;

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

        // Update in DB as well
        const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '[]');
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            users[idx] = user;
            localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
        }
    },
    logout: () => localStorage.removeItem(STORAGE_KEYS.USER),
};

const MockBand = {
    getBand: (bandId: string): Band | undefined => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        return bands.find(b => b.id === bandId);
    },
    getUserBands: (user: User): Band[] => {
        if (!user.bandIds || user.bandIds.length === 0) return [];
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        return bands.filter(b => user.bandIds.includes(b.id));
    },
    getUserProfileWithBands: async (userId: string): Promise<{ user: User, bands: {id: string, name: string, imageUrl?: string, role: UserRole}[] } | null> => {
        const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '[]');
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) return null;
        
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const userBandsData = bands
            .filter(b => b.members.some(m => m.id === userId))
            .map(b => ({
                id: b.id,
                name: b.name,
                imageUrl: b.imageUrl,
                role: b.members.find(m => m.id === userId)?.role || UserRole.MEMBER
            }));
            
        return { user: targetUser, bands: userBandsData };
    },
    createBand: async (name: string, user: User, imageUrl?: string): Promise<Band> => {
        await new Promise(r => setTimeout(r, 500));
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const newBand: Band = {
            id: generateId(), name, imageUrl, joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            members: [{ ...user, role: UserRole.ADMIN }],
            inventory: [], sales: [], pendingRequests: [],
            showPaymentQr: true, showPaymentPhone: true
        };
        bands.push(newBand);
        localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
        const allUsers: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '[]');
        const uIdx = allUsers.findIndex(u => u.id === user.id);
        if (uIdx !== -1) {
            allUsers[uIdx].bandIds.push(newBand.id);
            localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(allUsers));
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(allUsers[uIdx]));
        }
        return newBand;
    },
    updateBandDetails: async (bandId: string, name: string, description?: string, imageUrl?: string, paymentQrUrl?: string, paymentPhoneNumber?: string, paymentRecipientName?: string, showPaymentQr?: boolean, showPaymentPhone?: boolean): Promise<void> => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const idx = bands.findIndex(b => b.id === bandId);
        if (idx !== -1) {
            bands[idx].name = name;
            if (description !== undefined) bands[idx].description = description;
            if (imageUrl !== undefined) bands[idx].imageUrl = imageUrl;
            if (paymentQrUrl !== undefined) bands[idx].paymentQrUrl = paymentQrUrl;
            if (paymentPhoneNumber !== undefined) bands[idx].paymentPhoneNumber = paymentPhoneNumber;
            if (paymentRecipientName !== undefined) bands[idx].paymentRecipientName = paymentRecipientName;
            if (showPaymentQr !== undefined) bands[idx].showPaymentQr = showPaymentQr;
            if (showPaymentPhone !== undefined) bands[idx].showPaymentPhone = showPaymentPhone;
            localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
        }
    },
    joinBand: (bandId: string, user: User): boolean => {
         const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
         const band = bands.find(b => b.id === bandId);
         if (!band) return false;
         if (!band.pendingRequests.some(u => u.id === user.id)) {
             band.pendingRequests.push(user);
             localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
         }
         return true;
    },
    approveRequest: (bandId: string, userId: string) => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const band = bands.find(b => b.id === bandId);
        if (!band) return;
        const reqIdx = band.pendingRequests.findIndex(u => u.id === userId);
        if (reqIdx === -1) return;
        const user = band.pendingRequests[reqIdx];
        band.members.push({ ...user, role: UserRole.MEMBER });
        band.pendingRequests.splice(reqIdx, 1);
        localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
        
        const allUsers: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '[]');
        const uIdx = allUsers.findIndex(u => u.id === userId);
        if (uIdx !== -1) {
            allUsers[uIdx].bandIds.push(bandId);
            localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(allUsers));
        }
    },
    updateMemberRole: (bandId: string, userId: string, role: UserRole) => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const band = bands.find(b => b.id === bandId);
        if (!band) return;
        
        const member = band.members.find(m => m.id === userId);
        if (member) {
            member.role = role;
            localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
        }
    },
    removeMember: (bandId: string, userId: string) => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const band = bands.find(b => b.id === bandId);
        if (!band) return;
        
        band.members = band.members.filter(m => m.id !== userId);
        localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));

        // Optional: Remove bandId from user profile in mock
        const allUsers: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '[]');
        const uIdx = allUsers.findIndex(u => u.id === userId);
        if (uIdx !== -1) {
            allUsers[uIdx].bandIds = allUsers[uIdx].bandIds.filter(bid => bid !== bandId);
            localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(allUsers));
        }
    },
    recordSale: (bandId: string, sale: Sale) => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const band = bands.find(b => b.id === bandId);
        if (!band) return;
        band.sales.push(sale);
        sale.items.forEach(si => {
            const item = band.inventory.find(i => i.id === si.itemId);
            const v = item?.variants.find(v => v.label === si.variantLabel);
            if (v) v.stock -= si.quantity;
        });
        localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
    },
    updateSale: (bandId: string, originalSale: Sale, updatedSale: Sale) => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const band = bands.find(b => b.id === bandId);
        if (!band) return;

        // Revert old stock
        originalSale.items.forEach(si => {
            const item = band.inventory.find(i => i.id === si.itemId);
            const v = item?.variants.find(v => v.label === si.variantLabel);
            if (v) v.stock += si.quantity;
        });

        // Apply new stock
        updatedSale.items.forEach(si => {
            const item = band.inventory.find(i => i.id === si.itemId);
            const v = item?.variants.find(v => v.label === si.variantLabel);
            if (v) v.stock -= si.quantity;
        });

        const saleIndex = band.sales.findIndex(s => s.id === originalSale.id);
        if (saleIndex !== -1) {
            band.sales[saleIndex] = updatedSale;
        }

        localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
    },
    deleteSale: (bandId: string, sale: Sale) => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const band = bands.find(b => b.id === bandId);
        if (!band) return;

        // Revert stock
        sale.items.forEach(si => {
            const item = band.inventory.find(i => i.id === si.itemId);
            const v = item?.variants.find(v => v.label === si.variantLabel);
            if (v) v.stock += si.quantity;
        });

        band.sales = band.sales.filter(s => s.id !== sale.id);
        localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
    },
    updateInventory: (bandId: string, item: Item) => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const band = bands.find(b => b.id === bandId);
        if (!band) return;
        const idx = band.inventory.findIndex(i => i.id === item.id);
        if (idx >= 0) band.inventory[idx] = item;
        else band.inventory.push(item);
        localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
    },
    deleteItem: (bandId: string, itemId: string) => {
        const bands: Band[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANDS) || '[]');
        const band = bands.find(b => b.id === bandId);
        if (!band) return;
        band.inventory = band.inventory.filter(i => i.id !== itemId);
        localStorage.setItem(STORAGE_KEYS.BANDS, JSON.stringify(bands));
    }
};
