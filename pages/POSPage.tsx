import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { Item, CartItem, Sale, ItemVariant } from '../types';
import { BandService } from '../services/storage';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, Package, X, ChevronRight, ChevronLeft, ShoppingBag, QrCode, Phone, Copy } from 'lucide-react';

export default function POSPage() {
  const { currentBand, user, refreshData } = useApp();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [success, setSuccess] = useState(false);
  
  // UI State
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Sorted Inventory
  const sortedInventory = useMemo(() => {
    if (!currentBand) return [];
    return [...currentBand.inventory].sort((a, b) => a.name.localeCompare(b.name));
  }, [currentBand]);

  if (!currentBand) return null;

  // --- Logic ---

  const handleItemClick = (item: Item) => {
    // If only one variant (Universal), add directly
    if (item.variants.length === 1 && item.variants[0].label === 'Universal') {
        addToCart(item, item.variants[0]);
    } else {
        setSelectedItem(item);
    }
  };

  const addToCart = (item: Item, variant: ItemVariant) => {
    if (variant.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedVariant === variant.label);
      if (existing) {
        if (existing.quantity >= variant.stock) return prev;
        return prev.map(i => (i.id === item.id && i.selectedVariant === variant.label) 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, selectedVariant: variant.label, quantity: 1 }];
    });
    setSelectedItem(null);
  };

  const updateQuantity = (itemId: string, variantLabel: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId && item.selectedVariant === variantLabel) {
        const originalItem = currentBand.inventory.find(i => i.id === itemId);
        const originalVariant = originalItem?.variants.find(v => v.label === variantLabel);
        const maxStock = originalVariant?.stock || 0;

        const newQty = item.quantity + delta;
        if (newQty > maxStock) return item; // Don't exceed stock
        return newQty > 0 ? { ...item, quantity: newQty } : item; // Don't go below 1 (use delete button for that)
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string, variantLabel: string) => {
    setCart(prev => prev.filter(i => !(i.id === itemId && i.selectedVariant === variantLabel)));
    // If cart becomes empty, close it automatically
    if (cart.length === 1) setIsCartOpen(false);
  };

  const handleCheckoutClick = () => {
      if (cart.length === 0 || !user) return;
      
      const hasQr = currentBand.paymentQrUrl && currentBand.showPaymentQr;
      const hasPhone = currentBand.paymentPhoneNumber && currentBand.showPaymentPhone;

      // Check if band has payment methods visible
      if (hasQr || hasPhone) {
          setShowQrModal(true);
      } else {
          // No QR/Phone visible, proceed directly
          processTransaction();
      }
  };

  const processTransaction = () => {
    if (!user) return;

    const newSale: Sale = {
      id: Math.random().toString(36).substring(7),
      items: cart.map(i => ({
        itemId: i.id,
        variantLabel: i.selectedVariant,
        quantity: i.quantity,
        priceAtSale: i.price,
        name: i.name
      })),
      total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
      timestamp: new Date().toISOString(),
      sellerId: user.id,
      sellerName: user.name,
    };

    BandService.recordSale(currentBand.id, newSale);
    refreshData();
    
    setShowQrModal(false);
    setSuccess(true);
    
    setTimeout(() => {
        setSuccess(false);
        setCart([]);
        setIsCartOpen(false);
    }, 1500);
  };

  const copyPhone = () => {
      if(currentBand.paymentPhoneNumber) {
          navigator.clipboard.writeText(currentBand.paymentPhoneNumber);
          alert('Номер скопирован');
      }
  }

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // --- Renders ---

  return (
    // Updated padding: p-5 on mobile, md:p-10 on desktop
    <div className="h-full relative pb-24 md:pb-0 p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-10">
      <header className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Касса</h2>
            <div className="text-zinc-500 text-sm font-medium">{currentBand.inventory.length} позиций</div>
      </header>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-32">
          {sortedInventory.map(item => {
            const totalStock = item.variants.reduce((a, b) => a + b.stock, 0);
            return (
                <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={totalStock === 0}
                className={`group relative overflow-hidden rounded-3xl border text-left transition-all flex flex-col aspect-[4/5] ${
                    totalStock === 0
                    ? 'bg-zinc-900/30 border-zinc-800 opacity-50 cursor-not-allowed'
                    : 'bg-zinc-900 border-zinc-800 active:scale-[0.98]'
                }`}
                >
                <div className="h-2/3 w-full bg-zinc-800 relative overflow-hidden">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt=""/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                             <Package size={32} />
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg text-sm font-bold font-mono">
                        {item.price} ₽
                    </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                    <h3 className="font-bold text-white leading-tight line-clamp-2 text-sm">{item.name}</h3>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        <span>{item.variants.length > 1 || item.variants[0].label !== 'Universal' ? 'Вариации' : 'Универсал'}</span>
                        <span className={`${totalStock < 5 ? 'text-red-500' : 'text-zinc-400'}`}>
                            {totalStock} шт
                        </span>
                    </div>
                </div>
                </button>
            );
          })}
      </div>

      {/* Floating Bottom Bar (Visible if items in cart) */}
      {cart.length > 0 && !isCartOpen && (
          <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-10 md:w-96 z-40 animate-slide-up">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-primary text-white p-4 rounded-3xl shadow-2xl shadow-primary/30 flex items-center justify-between border border-primary/50 backdrop-blur-xl"
              >
                  <div className="flex items-center gap-3">
                      <div className="bg-black/20 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                          {totalItems}
                      </div>
                      <div className="flex flex-col items-start">
                          <span className="text-xs text-primary-100 font-medium">Итого</span>
                          <span className="font-bold text-lg leading-none">{total} ₽</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 font-bold pr-2">
                      Рассчитать
                      <ChevronRight size={20} />
                  </div>
              </button>
          </div>
      )}

      {/* Full Screen Cart Modal */}
      {isCartOpen && createPortal(
          <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in touch-none">
              {/* Cart Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-900 pt-safe bg-zinc-950">
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
                  >
                      <ChevronLeft size={28} />
                  </button>
                  <span className="font-bold text-lg text-white flex items-center gap-2">
                      <ShoppingBag size={20} className="text-primary" />
                      Корзина
                  </span>
                  <button 
                    onClick={() => { setCart([]); setIsCartOpen(false); }}
                    className="text-xs text-red-500 font-medium"
                  >
                      Очистить
                  </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 touch-pan-y overscroll-contain">
                 {cart.map((item) => (
                    <div key={`${item.id}-${item.selectedVariant}`} className="bg-zinc-900 rounded-2xl p-4 flex gap-4 border border-zinc-800">
                        <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 shrink-0 overflow-hidden">
                             {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package size={20} />}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-white font-bold text-sm line-clamp-1">{item.name}</div>
                                    <div className="text-xs text-zinc-500 mt-1">
                                        {item.selectedVariant !== 'Universal' ? `Размер: ${item.selectedVariant}` : 'Стандарт'}
                                    </div>
                                </div>
                                <div className="font-mono text-white font-bold">{item.price * item.quantity} ₽</div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-4 bg-black/40 rounded-lg p-1">
                                    <button 
                                        onClick={() => updateQuantity(item.id, item.selectedVariant, -1)}
                                        className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-md text-zinc-400 hover:text-white"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="font-mono text-white font-bold w-4 text-center">{item.quantity}</span>
                                    <button 
                                        onClick={() => updateQuantity(item.id, item.selectedVariant, 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-md text-zinc-400 hover:text-white"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => removeFromCart(item.id, item.selectedVariant)}
                                    className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                 ))}
                 
                 {cart.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                         <ShoppingBag size={48} className="mb-4 opacity-50" />
                         <p>Корзина пуста</p>
                     </div>
                 )}
              </div>

              {/* Cart Footer */}
              <div className="p-6 bg-zinc-900 border-t border-zinc-800 pb-12 md:pb-6">
                  <div className="flex justify-between items-end mb-6">
                      <span className="text-zinc-500 font-medium text-sm">Итого к оплате</span>
                      <span className="text-4xl font-black text-white tracking-tighter">{total} ₽</span>
                  </div>
                  <button
                    onClick={handleCheckoutClick}
                    disabled={success || cart.length === 0}
                    className={`w-full py-5 rounded-2xl font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                        success 
                            ? 'bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.3)]' 
                            : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:shadow-none'
                    }`}
                  >
                    {success ? (
                        <>
                            <CheckCircle size={24} />
                            <span>Оплачено!</span>
                        </>
                    ) : (
                        'Принять Оплату'
                    )}
                  </button>
              </div>
          </div>,
          document.body
      )}

      {/* Payment Options Modal */}
      {showQrModal && createPortal(
          <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in touch-none">
              <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative animate-slide-up flex flex-col items-center text-center shadow-2xl max-h-[90vh] overflow-y-auto">
                  <button 
                    onClick={() => setShowQrModal(false)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2"
                  >
                      <X size={24} />
                  </button>

                  <h3 className="text-2xl font-black text-white uppercase italic mb-6">Оплата</h3>
                  
                  {/* QR SECTION */}
                  {currentBand.paymentQrUrl && currentBand.showPaymentQr && (
                      <div className="w-full mb-6">
                           <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                               <img src={currentBand.paymentQrUrl} alt="Payment QR" className="max-w-full h-48 object-contain" />
                           </div>
                           <p className="text-zinc-500 text-xs mt-2">QR код для оплаты</p>
                      </div>
                  )}

                  {/* PHONE SECTION */}
                  {currentBand.paymentPhoneNumber && currentBand.showPaymentPhone && (
                      <div className="w-full mb-8">
                          <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-2">Перевод по номеру</p>
                          <button 
                            onClick={copyPhone}
                            className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:border-zinc-700 group"
                          >
                              <Phone size={20} className="text-primary" />
                              <span className="text-xl font-mono font-bold text-white">{currentBand.paymentPhoneNumber}</span>
                              <Copy size={16} className="text-zinc-600 group-hover:text-white" />
                          </button>
                          
                          {/* RECIPIENT NAME */}
                          {currentBand.paymentRecipientName && (
                              <div className="mt-3 text-sm text-zinc-400 font-medium">
                                  Получатель: <span className="text-white">{currentBand.paymentRecipientName}</span>
                              </div>
                          )}
                      </div>
                  )}

                  <div className="w-full h-px bg-zinc-900 mb-6"></div>

                  <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Сумма к оплате</div>
                  <div className="text-4xl font-black text-white mb-8">{total} ₽</div>

                  <button
                    onClick={processTransaction}
                    className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest text-sm transition-all shadow-lg shadow-green-500/20 active:scale-[0.98]"
                  >
                      Оплата получена
                  </button>
              </div>
          </div>,
          document.body
      )}

      {/* Variant Selection Modal */}
      {selectedItem && createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
              <div className="bg-zinc-900 border border-zinc-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 pb-12 md:pb-6 shadow-2xl relative animate-slide-up touch-pan-y">
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2"
                  >
                      <X size={24} />
                  </button>
                  
                  <div className="mb-6 pr-8">
                      <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{selectedItem.name}</h3>
                      <p className="text-zinc-400 text-sm">Выберите размер</p>
                  </div>

                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pb-4">
                      {selectedItem.variants.map((v, idx) => (
                          <button
                            key={idx}
                            disabled={v.stock <= 0}
                            onClick={() => addToCart(selectedItem, v)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                v.stock <= 0 
                                    ? 'border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed'
                                    : 'border-zinc-700 bg-zinc-800/50 hover:border-primary hover:bg-zinc-800 text-white active:scale-[0.98]'
                            }`}
                          >
                              <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${v.stock <= 0 ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-700 text-white'}`}>
                                    {v.label}
                                  </div>
                                  {v.stock < 5 && v.stock > 0 && <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded font-bold uppercase">Мало</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-zinc-500 text-sm">{v.stock} шт</span>
                                  <ChevronRight size={16} className="text-zinc-600" />
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
}