import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { ProjectService } from '../services/storage';
import { Project, Task, ProjectType, Comment } from '../types';
import { FolderKanban, Plus, Music, Calendar, ChevronRight, X, CheckCircle, Circle, Link as LinkIcon, ExternalLink, Trash2, Mic2, Mic, MapPin, Navigation, Clock, AlignLeft, FileText, Check, Edit2, MessageSquare, Send, User as UserIcon, AlertTriangle, GripVertical } from 'lucide-react';

export default function ProjectsPage() {
  const { currentBand, user } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<ProjectType>('SONG');

  // Create Project Modal
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ProjectType>('SONG');
  
  // Extra fields for Events/Rehearsals
  const [newDate, setNewDate] = useState(''); // YYYY-MM-DD
  const [newTime, setNewTime] = useState(''); // HH:MM
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Active Project View
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  
  // Edit Project State
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editForm, setEditForm] = useState<{
      title: string;
      date: string;
      time: string;
      location: string;
      description: string;
  }>({ title: '', date: '', time: '', location: '', description: '' });

  // Create Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Edit Link State
  const [editingLinkTask, setEditingLinkTask] = useState<string | null>(null);
  const [linkUrlInput, setLinkUrlInput] = useState('');

  // --- DRAG AND DROP STATE ---
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // --- CHAT STATE ---
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- CONFIRMATION MODAL STATE ---
  const [confirmState, setConfirmState] = useState<{
      isOpen: boolean;
      type: 'DELETE_PROJECT' | 'DELETE_COMMENT' | null;
      targetId: string | null;
      title: string;
      message: string;
  }>({
      isOpen: false,
      type: null,
      targetId: null,
      title: '',
      message: ''
  });

  const fetchProjects = async () => {
      if (!currentBand) return;
      try {
          const data = await ProjectService.getProjects(currentBand.id);
          setProjects(data);
          
          // Refresh active project if open
          if (activeProject) {
              const updated = data.find(p => p.id === activeProject.id);
              if (updated) setActiveProject(updated);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchProjects();
  }, [currentBand]);

  // Handle URL Params for Deep Linking
  useEffect(() => {
      const projectId = searchParams.get('id');
      if (projectId && projects.length > 0) {
          const target = projects.find(p => p.id === projectId);
          if (target) {
              setActiveProject(target);
              setActiveTab(target.type); // Switch tab to match project type
          }
      }
  }, [projects, searchParams]);

  // Load comments when active project changes
  useEffect(() => {
      if (activeProject) {
          fetchComments(activeProject.id);
      }
  }, [activeProject?.id]);

  const fetchComments = async (projectId: string) => {
      setLoadingComments(true);
      try {
          const data = await ProjectService.getProjectComments(projectId);
          setComments(data);
          setTimeout(scrollToBottom, 100);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingComments(false);
      }
  };

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateProject = async () => {
      if (!currentBand || !newTitle) return;
      
      await ProjectService.createProject(
          currentBand.id, 
          newTitle, 
          newType, 
          newDate || undefined, 
          newTime || undefined, 
          newLocation, 
          newDescription
      );
      
      setIsCreating(false);
      setNewTitle('');
      setNewDate('');
      setNewTime('');
      setNewLocation('');
      setNewDescription('');
      fetchProjects();
  };

  const openCreateModal = () => {
      setNewType(activeTab); // Default to current tab
      setIsCreating(true);
  };

  const handleOpenProject = (project: Project) => {
      setActiveProject(project);
      setIsEditingProject(false);
      // Optional: Update URL to reflect state without reloading
      setSearchParams({ id: project.id });
  };

  const handleCloseProject = () => {
      setActiveProject(null);
      setSearchParams({});
  };

  // --- EDIT PROJECT LOGIC ---
  const handleStartEdit = () => {
      if (!activeProject) return;
      setEditForm({
          title: activeProject.title,
          date: activeProject.date || '',
          time: activeProject.startTime || '',
          location: activeProject.location || '',
          description: activeProject.description || ''
      });
      setIsEditingProject(true);
  };

  const handleCancelEdit = () => {
      setIsEditingProject(false);
  };

  const handleSaveEdit = async () => {
      if (!activeProject) return;
      try {
          await ProjectService.updateProject(activeProject.id, {
              title: editForm.title,
              date: editForm.date,
              startTime: editForm.time,
              location: editForm.location,
              description: editForm.description
          });
          
          setIsEditingProject(false);
          fetchProjects(); // Will also refresh activeProject via the effect/fetch logic
      } catch (e) {
          console.error(e);
          alert('Ошибка при сохранении изменений');
      }
  };

  // --- TASK LOGIC ---

  const handleAddTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeProject || !newTaskTitle) return;
      await ProjectService.addTask(activeProject.id, newTaskTitle);
      setNewTaskTitle('');
      fetchProjects();
  };

  const handleToggleTask = async (task: Task) => {
      // Optimistic Update
      if (activeProject) {
         const updatedTasks = activeProject.tasks.map(t => 
             t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t
         );
         setActiveProject({ ...activeProject, tasks: updatedTasks });
      }
      
      await ProjectService.toggleTask(task.id, !task.isCompleted);
      fetchProjects();
  };

  // Replaced confirm() with Custom Modal Request
  const requestDeleteProject = (id: string) => {
      setConfirmState({
          isOpen: true,
          type: 'DELETE_PROJECT',
          targetId: id,
          title: 'Удалить проект?',
          message: 'Это действие нельзя отменить. Все задачи и переписка будут удалены.'
      });
  };
  
  const handleDeleteTask = async (id: string) => {
      await ProjectService.deleteTask(id);
      fetchProjects();
  }

  const handleSaveLink = async (taskId: string) => {
      await ProjectService.updateTaskLink(taskId, linkUrlInput);
      setEditingLinkTask(null);
      setLinkUrlInput('');
      fetchProjects();
  };

  // --- DRAG AND DROP HANDLERS ---
  
  const moveTask = (dragId: string, targetId: string) => {
      if (!activeProject || dragId === targetId) return;
      
      const tasks = [...activeProject.tasks];
      const dragIndex = tasks.findIndex(t => t.id === dragId);
      const targetIndex = tasks.findIndex(t => t.id === targetId);
      
      if (dragIndex === -1 || targetIndex === -1) return;
      
      const [item] = tasks.splice(dragIndex, 1);
      tasks.splice(targetIndex, 0, item);
      
      // Update state for UI feedback
      setActiveProject({ ...activeProject, tasks });
  };

  const saveTaskOrder = async () => {
      if (!activeProject) return;
      try {
          await ProjectService.reorderTasks(activeProject.tasks);
      } catch (error) {
          console.error("Failed to save order", error);
          fetchProjects(); // Revert on error
      }
  };

  // Desktop Drag Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
      e.preventDefault();
      if (!draggedTaskId) return;
      
      moveTask(draggedTaskId, targetTaskId);
      setDraggedTaskId(null);
      await saveTaskOrder();
  };

  // Mobile Touch Handlers
  const touchItemRef = useRef<string | null>(null);

  const handleTouchStart = (e: React.TouchEvent, taskId: string) => {
      touchItemRef.current = taskId;
      setDraggedTaskId(taskId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchItemRef.current) return;
      // Prevent scrolling while dragging a task
      // e.preventDefault(); // Note: This might block scrolling even if we want to scroll. 
      // Better to rely on touch-action: none CSS on the drag handle.

      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const taskRow = element?.closest('[data-task-id]');
      
      if (taskRow) {
          const targetId = taskRow.getAttribute('data-task-id');
          if (targetId && targetId !== touchItemRef.current) {
              moveTask(touchItemRef.current, targetId);
          }
      }
  };

  const handleTouchEnd = async () => {
      if (touchItemRef.current) {
          await saveTaskOrder();
      }
      setDraggedTaskId(null);
      touchItemRef.current = null;
  };


  // --- CHAT LOGIC ---
  const handleSendComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeProject || !user || !newComment.trim()) return;
      
      const content = newComment.trim();
      setNewComment('');
      
      // Optimistic Update
      const tempComment: Comment = {
          id: 'temp-' + Date.now(),
          projectId: activeProject.id,
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatarUrl,
          content: content,
          createdAt: new Date().toISOString()
      };
      setComments(prev => [...prev, tempComment]);
      scrollToBottom();

      try {
          await ProjectService.addProjectComment(activeProject.id, user, content);
          fetchComments(activeProject.id); // Refresh for real ID
      } catch (e) {
          console.error(e);
          alert("Не удалось отправить сообщение");
      }
  };

  // Replaced confirm() with Custom Modal Request
  const requestDeleteComment = (commentId: string) => {
      setConfirmState({
          isOpen: true,
          type: 'DELETE_COMMENT',
          targetId: commentId,
          title: 'Удалить сообщение?',
          message: 'Вы уверены, что хотите удалить это сообщение?'
      });
  };

  // --- EXECUTE ACTIONS (Called by Modal) ---
  const executeAction = async () => {
      if (!confirmState.targetId || !confirmState.type) return;

      const { type, targetId } = confirmState;
      // Close modal immediately
      setConfirmState({ ...confirmState, isOpen: false });

      try {
          if (type === 'DELETE_PROJECT') {
              await ProjectService.deleteProject(targetId);
              handleCloseProject();
              fetchProjects();
          } else if (type === 'DELETE_COMMENT') {
              // Optimistic remove
              setComments(prev => prev.filter(c => c.id !== targetId));
              await ProjectService.deleteProjectComment(targetId);
              if (activeProject) fetchComments(activeProject.id);
          }
      } catch (e) {
          console.error(e);
          alert("Ошибка при выполнении действия. Проверьте права доступа.");
      }
  };

  const calculateProgress = (tasks: Task[]) => {
      if (tasks.length === 0) return 0;
      const completed = tasks.filter(t => t.isCompleted).length;
      return Math.round((completed / tasks.length) * 100);
  };

  const openInMaps = (location: string) => {
      const url = `https://yandex.ru/maps/?text=${encodeURIComponent(location)}`;
      window.open(url, '_blank');
  };

  // FILTER: Only show active projects.
  const filteredProjects = projects.filter(p => p.type === activeTab && p.status === 'IN_PROGRESS');

  if (!currentBand) return null;

  const isSong = activeProject?.type === 'SONG';
  const isEventOrRehearsal = activeProject?.type === 'EVENT' || activeProject?.type === 'REHEARSAL';

  return (
    <div className="h-full flex flex-col p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-10 pb-24">
        <header className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Проекты</h2>
                <div className="h-1 w-12 bg-purple-500 mt-1 rounded-full"></div>
            </div>
            <button 
                onClick={openCreateModal}
                className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-2xl shadow-lg shadow-purple-900/40 active:scale-95 transition-all"
            >
                <Plus size={24} />
            </button>
        </header>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-900 rounded-2xl mb-6 overflow-x-auto no-scrollbar">
            <button
                onClick={() => setActiveTab('SONG')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                    activeTab === 'SONG' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                Песни
            </button>
            <button
                onClick={() => setActiveTab('EVENT')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                    activeTab === 'EVENT' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                Концерты
            </button>
            <button
                onClick={() => setActiveTab('REHEARSAL')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                    activeTab === 'REHEARSAL' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                Репетиции
            </button>
        </div>

        {loading ? (
             <div className="flex-1 flex items-center justify-center">
                 <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
             </div>
        ) : filteredProjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/20">
                <FolderKanban size={48} className="mb-4 opacity-50" />
                <p>Нет активных проектов</p>
                <button onClick={openCreateModal} className="text-purple-400 text-sm font-bold mt-2">Создать</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-4">
                {filteredProjects.map(project => {
                    const progress = calculateProgress(project.tasks);
                    
                    let icon = <Music size={20} />;
                    let typeLabel = 'Песня';
                    let colorClass = 'bg-indigo-500/10 text-indigo-400';
                    let bgIcon = <Music size={80} />;

                    if (project.type === 'EVENT') {
                        icon = <Calendar size={20} />;
                        typeLabel = 'Концерт';
                        colorClass = 'bg-orange-500/10 text-orange-400';
                        bgIcon = <Calendar size={80} />;
                    } else if (project.type === 'REHEARSAL') {
                        icon = <Mic size={20} />;
                        typeLabel = 'Репетиция';
                        colorClass = 'bg-green-500/10 text-green-400';
                        bgIcon = <Mic size={80} />;
                    }

                    return (
                        <button
                            key={project.id}
                            onClick={() => handleOpenProject(project)}
                            className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-left hover:bg-zinc-800 transition-all active:scale-[0.99] group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                {bgIcon}
                            </div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                                    {icon}
                                </div>
                                <div className="bg-zinc-800 px-2 py-1 rounded text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                                    {typeLabel}
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-1 relative z-10 truncate">{project.title}</h3>
                            
                            {/* Date & Location for Events/Rehearsals */}
                            {(project.type === 'EVENT' || project.type === 'REHEARSAL') && (
                                <div className="mb-4 space-y-1 relative z-10">
                                    {project.date && (
                                        <div className="flex items-center gap-2 text-zinc-400 text-xs">
                                            <Calendar size={12} />
                                            <span>{new Date(project.date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    {project.startTime && (
                                        <div className="flex items-center gap-2 text-zinc-400 text-xs">
                                            <Clock size={12} />
                                            <span>{project.startTime}</span>
                                        </div>
                                    )}
                                    {project.location && (
                                        <div className="flex items-center gap-2 text-zinc-400 text-xs truncate">
                                            <MapPin size={12} />
                                            <span className="truncate">{project.location}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Standard Details for Songs */}
                            {project.type === 'SONG' && (
                                <p className="text-zinc-500 text-xs mb-4 relative z-10">{project.tasks.length} задач</p>
                            )}
                            
                            {/* Progress bar only for Songs */}
                            {project.type === 'SONG' && (
                                <div className="relative z-10">
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 mb-1">
                                        <span>Прогресс</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                progress === 100 ? 'bg-green-500' : 'bg-purple-500'
                                            }`} 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        )}

        {/* CREATE MODAL */}
        {isCreating && createPortal(
            <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
                 <div className="bg-zinc-950 border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-12 sm:pb-6 shadow-2xl relative animate-slide-up max-h-[90vh] overflow-y-auto">
                      <h3 className="text-xl font-bold text-white mb-6">Новый проект</h3>
                      <div className="space-y-4">
                          
                          {/* Title Input */}
                          <div className="space-y-1">
                                <label className="text-xs text-zinc-500 uppercase font-bold pl-1">Название</label>
                                <input
                                    type="text"
                                    placeholder="Например: Альбом 2024"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none"
                                />
                          </div>

                          {/* Extra Fields for Events/Rehearsals */}
                          {(newType === 'EVENT' || newType === 'REHEARSAL') && (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-1">
                                        <label className="text-xs text-zinc-500 uppercase font-bold pl-1">Дата</label>
                                        <input
                                            type="date"
                                            value={newDate}
                                            onChange={e => setNewDate(e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white text-xs focus:border-purple-500 outline-none"
                                        />
                                   </div>
                                   <div className="space-y-1">
                                        <label className="text-xs text-zinc-500 uppercase font-bold pl-1">Время</label>
                                        <input
                                            type="time"
                                            value={newTime}
                                            onChange={e => setNewTime(e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white text-xs focus:border-purple-500 outline-none"
                                        />
                                   </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-500 uppercase font-bold pl-1">Место / Адрес</label>
                                    <input
                                        type="text"
                                        placeholder="Клуб, Студия..."
                                        value={newLocation}
                                        onChange={e => setNewLocation(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white text-xs focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-500 uppercase font-bold pl-1">Комментарий / Сетлист</label>
                                    <textarea
                                        placeholder="Дополнительная информация..."
                                        value={newDescription}
                                        onChange={e => setNewDescription(e.target.value)}
                                        rows={4}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white text-xs focus:border-purple-500 outline-none resize-none"
                                    />
                                </div>
                              </>
                          )}

                          {/* Type Selector */}
                          <div className="grid grid-cols-3 gap-2">
                              <button 
                                onClick={() => setNewType('SONG')}
                                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                                    newType === 'SONG' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                                }`}
                              >
                                  <Music size={18} /> Песня
                              </button>
                              <button 
                                onClick={() => setNewType('EVENT')}
                                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                                    newType === 'EVENT' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                                }`}
                              >
                                  <Calendar size={18} /> Концерт
                              </button>
                              <button 
                                onClick={() => setNewType('REHEARSAL')}
                                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                                    newType === 'REHEARSAL' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                                }`}
                              >
                                  <Mic size={18} /> Репа
                              </button>
                          </div>

                          <div className="flex gap-3 pt-4">
                              <button onClick={() => setIsCreating(false)} className="flex-1 py-3 bg-zinc-800 rounded-xl font-bold text-zinc-400">Отмена</button>
                              <button onClick={handleCreateProject} className="flex-1 py-3 bg-purple-600 rounded-xl font-bold text-white">Создать</button>
                          </div>
                      </div>
                 </div>
            </div>,
            document.body
        )}

        {/* PROJECT DETAILS MODAL */}
        {activeProject && createPortal(
            <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col animate-fade-in">
                 {/* Header */}
                 <div className="p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] flex items-center justify-between border-b border-zinc-900 bg-zinc-950 z-20">
                      <button onClick={handleCloseProject} className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full">
                          <ChevronRight className="rotate-180" size={24} />
                      </button>
                      
                      {/* Title: Display vs Edit */}
                      {isEditingProject ? (
                          <input 
                              type="text"
                              value={editForm.title}
                              onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white font-bold text-center outline-none focus:border-purple-500 w-full mx-4"
                          />
                      ) : (
                          <span className="font-bold text-white truncate max-w-[180px] text-lg">{activeProject.title}</span>
                      )}

                      <div className="flex items-center gap-2 -mr-2">
                        {isEventOrRehearsal && (
                            isEditingProject ? (
                                <>
                                    <button onClick={handleCancelEdit} className="p-2 text-zinc-500 hover:text-white">
                                        <X size={20} />
                                    </button>
                                    <button onClick={handleSaveEdit} className="p-2 text-green-500 hover:text-green-400">
                                        <Check size={20} />
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleStartEdit} className="p-2 text-zinc-500 hover:text-white">
                                    <Edit2 size={18} />
                                </button>
                            )
                        )}
                        <button onClick={() => requestDeleteProject(activeProject.id)} className="p-2 text-zinc-600 hover:text-red-500">
                            <Trash2 size={20} />
                        </button>
                      </div>
                 </div>

                 {/* Content Scrollable Area */}
                 <div className={`flex-1 overflow-y-auto p-5 ${isSong ? 'pb-32' : 'pb-5'}`}>
                      
                      {/* Event/Rehearsal Info Block - Same as before */}
                      {isEventOrRehearsal && (
                          <div className="space-y-6">
                              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                    <div className="flex gap-4">
                                        {/* Date */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                <Calendar size={16} />
                                            </div>
                                            <div>
                                                {isEditingProject ? (
                                                    <input 
                                                        type="date"
                                                        value={editForm.date}
                                                        onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                                                        className="bg-black border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-28"
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="text-white font-bold text-sm">
                                                            {activeProject.date ? new Date(activeProject.date).toLocaleDateString() : '—'}
                                                        </div>
                                                        <div className="text-zinc-500 text-xs">Дата</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Time */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                <Clock size={16} />
                                            </div>
                                            <div>
                                                {isEditingProject ? (
                                                    <input 
                                                        type="time"
                                                        value={editForm.time}
                                                        onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                                                        className="bg-black border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-20"
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="text-white font-bold text-sm">
                                                            {activeProject.startTime || '—'}
                                                        </div>
                                                        <div className="text-zinc-500 text-xs">Время</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Location */}
                                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                                <MapPin size={16} />
                                            </div>
                                            <div className="truncate flex-1">
                                                {isEditingProject ? (
                                                    <input 
                                                        type="text"
                                                        value={editForm.location}
                                                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                                        className="bg-black border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full"
                                                        placeholder="Место"
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="text-white font-bold text-sm truncate">{activeProject.location || 'Место не указано'}</div>
                                                        <div className="text-zinc-500 text-xs">Место проведения</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {!isEditingProject && activeProject.location && (
                                            <button 
                                                onClick={() => openInMaps(activeProject.location!)}
                                                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-primary transition-colors"
                                                title="Открыть на карте"
                                            >
                                                <Navigation size={18} />
                                            </button>
                                        )}
                                    </div>
                              </div>

                              {/* Description / Comments Section */}
                              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                  <div className="flex items-center gap-2 mb-3 text-zinc-500">
                                      <FileText size={16} />
                                      <span className="text-xs font-bold uppercase tracking-widest">Комментарий / Сетлист</span>
                                  </div>
                                  
                                  {isEditingProject ? (
                                      <textarea
                                          value={editForm.description}
                                          onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                          rows={6}
                                          className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none resize-none leading-relaxed"
                                          placeholder="Напишите здесь сетлист или важные заметки..."
                                      />
                                  ) : (
                                      <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                          {activeProject.description || (
                                              <span className="text-zinc-600 italic">Нет описания</span>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* Progress Bar - ONLY FOR SONGS */}
                      {isSong && (
                          <div className="mb-6">
                               <div className="flex justify-between items-center mb-2">
                                   <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Прогресс</span>
                                   <span className="text-white font-mono font-bold">{calculateProgress(activeProject.tasks)}%</span>
                               </div>
                               <div className="h-1 bg-zinc-900 rounded-full">
                                   <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${calculateProgress(activeProject.tasks)}%` }}></div>
                               </div>
                          </div>
                      )}

                      {/* Tasks List - ONLY FOR SONGS */}
                      {isSong && (
                          <div className="space-y-3">
                               {activeProject.tasks.map(task => (
                                   <div 
                                      key={task.id} 
                                      data-task-id={task.id}
                                      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-3 group transition-opacity duration-200 ${draggedTaskId === task.id ? 'opacity-30 border-dashed border-purple-500' : ''}`}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, task.id)}
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e, task.id)}
                                      onDragEnd={() => setDraggedTaskId(null)}
                                      onTouchStart={(e) => handleTouchStart(e, task.id)}
                                      onTouchMove={handleTouchMove}
                                      onTouchEnd={handleTouchEnd}
                                   >
                                       {/* Drag Handle */}
                                       <div 
                                         className="flex items-center justify-center text-zinc-700 cursor-grab active:cursor-grabbing touch-none"
                                         style={{ touchAction: 'none' }}
                                       >
                                            <GripVertical size={20} />
                                       </div>

                                       <button onClick={() => handleToggleTask(task)} className="mt-1 shrink-0">
                                           {task.isCompleted ? (
                                               <CheckCircle className="text-green-500" size={20} />
                                           ) : (
                                               <Circle className="text-zinc-600 group-hover:text-zinc-400" size={20} />
                                           )}
                                       </button>
                                       
                                       <div className="flex-1 min-w-0">
                                           <div className={`font-medium break-words ${task.isCompleted ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                               {task.title}
                                           </div>
                                           
                                           {/* Link Section */}
                                           <div className="mt-2 flex flex-wrap gap-2 items-center">
                                               {task.linkUrl ? (
                                                   <a 
                                                    href={task.linkUrl.startsWith('http') ? task.linkUrl : `https://${task.linkUrl}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/20"
                                                   >
                                                       <ExternalLink size={10} />
                                                       Открыть файл
                                                   </a>
                                               ) : null}

                                               <button 
                                                onClick={() => { setEditingLinkTask(task.id); setLinkUrlInput(task.linkUrl || ''); }}
                                                className="text-[10px] text-zinc-600 hover:text-white flex items-center gap-1"
                                               >
                                                   <LinkIcon size={10} />
                                                   {task.linkUrl ? 'Изменить ссылку' : 'Прикрепить ссылку'}
                                               </button>
                                               
                                               <button onClick={() => handleDeleteTask(task.id)} className="ml-auto text-zinc-700 hover:text-red-500">
                                                   <Trash2 size={12} />
                                               </button>
                                           </div>

                                           {/* Link Input */}
                                           {editingLinkTask === task.id && (
                                               <div className="mt-2 flex gap-2 animate-fade-in">
                                                   <input 
                                                    type="text" 
                                                    placeholder="https://disk.yandex.ru/..." 
                                                    value={linkUrlInput}
                                                    onChange={e => setLinkUrlInput(e.target.value)}
                                                    className="flex-1 bg-black border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                                   />
                                                   <button onClick={() => handleSaveLink(task.id)} className="bg-indigo-600 px-3 rounded-lg text-white text-xs font-bold">OK</button>
                                                   <button onClick={() => setEditingLinkTask(null)} className="text-zinc-500">
                                                       <X size={14} />
                                                   </button>
                                               </div>
                                           )}
                                       </div>
                                   </div>
                               ))}
                          </div>
                      )}

                      {/* --- CHAT SECTION --- */}
                      <div className="mt-8 mb-4">
                           {/* ... chat code ... */}
                           <div className="flex items-center gap-2 mb-4">
                               <MessageSquare size={16} className="text-zinc-500" />
                               <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Чат проекта</span>
                           </div>

                           <div className="space-y-4 mb-4">
                               {comments.map(comment => {
                                   const isMe = comment.userId === user?.id;
                                   return (
                                       <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                           <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-700">
                                               {comment.userAvatar ? (
                                                   <img src={comment.userAvatar} className="w-full h-full object-cover" />
                                               ) : (
                                                   <div className="text-[10px] font-bold text-zinc-500">
                                                       {comment.userName.charAt(0)}
                                                   </div>
                                               )}
                                           </div>
                                           <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-4 py-2 rounded-2xl text-sm ${
                                                    isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                                                }`}>
                                                    {comment.content}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 px-1">
                                                    <span className="text-[10px] text-zinc-600">
                                                        {comment.userName} • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                    {isMe && (
                                                        <button 
                                                            onClick={() => requestDeleteComment(comment.id)}
                                                            className="text-zinc-600 hover:text-red-500"
                                                            title="Удалить сообщение"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                           </div>
                                       </div>
                                   );
                               })}
                               <div ref={messagesEndRef} />
                           </div>

                           {/* Comment Input */}
                           <form onSubmit={handleSendComment} className="flex gap-2">
                               <input 
                                type="text" 
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Написать сообщение..."
                                className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                               />
                               <button 
                                disabled={!newComment.trim()}
                                type="submit" 
                                className="bg-indigo-600 w-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                               >
                                   <Send size={20} />
                               </button>
                           </form>
                      </div>

                      <div className="h-20"></div> {/* Spacer */}
                 </div>

                 {/* Add Task Footer - ONLY FOR SONGS */}
                 {isSong && (
                     <form 
                        onSubmit={handleAddTask}
                        className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800 pb-[calc(1rem+env(safe-area-inset-bottom))]"
                     >
                         <div className="flex gap-2">
                             <input
                               type="text"
                               placeholder="Добавить задачу..."
                               value={newTaskTitle}
                               onChange={e => setNewTaskTitle(e.target.value)}
                               className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none"
                             />
                             <button 
                                type="submit" 
                                disabled={!newTaskTitle}
                                className="bg-purple-600 w-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                             >
                                 <Plus size={24} />
                             </button>
                         </div>
                     </form>
                 )}
            </div>,
            document.body
        )}

        {/* CUSTOM CONFIRMATION MODAL */}
        {confirmState.isOpen && createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
                <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-slide-up">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{confirmState.title}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            {confirmState.message}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                            className="flex-1 py-3 bg-zinc-800 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                        >
                            Отмена
                        </button>
                        <button 
                            onClick={executeAction}
                            className="flex-1 py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                        >
                            Удалить
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
}