
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { ProjectService } from '../services/storage';
import { Task, Comment } from '../types';
import { ChevronRight, X, CheckCircle, Circle, Link as LinkIcon, ExternalLink, Trash2, MapPin, Navigation, Clock, FileText, Check, Edit2, MessageSquare, Send, Calendar, AlertTriangle, GripVertical, Plus } from 'lucide-react';

interface ProjectDetailsModalProps {
    projectId: string | null;
    onClose: () => void;
}

export default function ProjectDetailsModal({ projectId, onClose }: ProjectDetailsModalProps) {
    const { projects, user, refreshProjects } = useApp();
    const activeProject = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

    // Edit Project State
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editForm, setEditForm] = useState<{
        title: string;
        date: string;
        time: string;
        location: string;
        description: string;
    }>({ title: '', date: '', time: '', location: '', description: '' });

    // Task State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [editingLinkTask, setEditingLinkTask] = useState<string | null>(null);
    const [linkUrlInput, setLinkUrlInput] = useState('');
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    // Chat State
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Confirmation Modal State
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

    // Load comments when project opens
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
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingComments(false);
        }
    };

    // --- ACTIONS ---

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
            refreshProjects(true);
        } catch (e) {
            console.error(e);
            alert('Ошибка при сохранении');
        }
    };

    const requestDeleteProject = () => {
        if (!activeProject) return;
        setConfirmState({
            isOpen: true,
            type: 'DELETE_PROJECT',
            targetId: activeProject.id,
            title: 'Удалить проект?',
            message: 'Это действие нельзя отменить. Все задачи и переписка будут удалены.'
        });
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeProject || !newTaskTitle) return;
        await ProjectService.addTask(activeProject.id, newTaskTitle);
        setNewTaskTitle('');
        refreshProjects(true);
    };

    const handleToggleTask = async (task: Task) => {
        await ProjectService.toggleTask(task.id, !task.isCompleted);
        refreshProjects(true);
    };

    const handleDeleteTask = async (id: string) => {
        await ProjectService.deleteTask(id);
        refreshProjects(true);
    };

    const handleSaveLink = async (taskId: string) => {
        await ProjectService.updateTaskLink(taskId, linkUrlInput);
        setEditingLinkTask(null);
        setLinkUrlInput('');
        refreshProjects(true);
    };

    // --- DRAG AND DROP ---
    const moveTask = async (dragId: string, targetId: string) => {
        if (!activeProject || dragId === targetId) return;
        
        const tasks = [...activeProject.tasks];
        const dragIndex = tasks.findIndex(t => t.id === dragId);
        const targetIndex = tasks.findIndex(t => t.id === targetId);
        
        if (dragIndex === -1 || targetIndex === -1) return;
        
        const [item] = tasks.splice(dragIndex, 1);
        tasks.splice(targetIndex, 0, item);
        
        // Immediate optimistic UI update handled by parent re-render? 
        // We can't update 'activeProject' directly as it is from props/memo.
        // We will call API directly.
        try {
            await ProjectService.reorderTasks(tasks);
            refreshProjects(true);
        } catch (e) {
            console.error(e);
        }
    };

    // Desktop
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
        await moveTask(draggedTaskId, targetTaskId);
        setDraggedTaskId(null);
    };

    // Mobile
    const touchItemRef = useRef<string | null>(null);
    const handleTouchStart = (e: React.TouchEvent, taskId: string) => {
        touchItemRef.current = taskId;
        setDraggedTaskId(taskId);
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchItemRef.current) return;
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const taskRow = element?.closest('[data-task-id]');
        if (taskRow) {
            const targetId = taskRow.getAttribute('data-task-id');
            if (targetId && targetId !== touchItemRef.current) {
                // For touch move, we usually wait until drop to commit, 
                // but real-time swap requires local state. 
                // Since we rely on global state, this might be jumpy without local optimistic state.
                // For now, let's just track the target and swap on end? 
                // Actually, the previous implementation swapped live. 
                // To keep it simple: we trigger the swap API immediately. 
                // It might flicker slightly until data refreshes.
                moveTask(touchItemRef.current, targetId);
                touchItemRef.current = targetId; // Update ref to avoid rapid swaps
            }
        }
    };
    const handleTouchEnd = () => {
        setDraggedTaskId(null);
        touchItemRef.current = null;
    };

    // --- CHAT ---
    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeProject || !user || !newComment.trim()) return;
        
        const content = newComment.trim();
        setNewComment('');
        
        // Optimistic
        const temp: Comment = {
            id: 'temp-' + Date.now(),
            projectId: activeProject.id,
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatarUrl,
            content: content,
            createdAt: new Date().toISOString()
        };
        setComments(prev => [...prev, temp]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        try {
            await ProjectService.addProjectComment(activeProject.id, user, content);
            fetchComments(activeProject.id);
        } catch (e) {
            console.error(e);
        }
    };

    const requestDeleteComment = (id: string) => {
        setConfirmState({
            isOpen: true,
            type: 'DELETE_COMMENT',
            targetId: id,
            title: 'Удалить?',
            message: 'Удалить это сообщение?'
        });
    };

    const executeAction = async () => {
        if (!confirmState.targetId) return;
        const { type, targetId } = confirmState;
        setConfirmState({ ...confirmState, isOpen: false });

        if (type === 'DELETE_PROJECT') {
            await ProjectService.deleteProject(targetId);
            onClose();
            refreshProjects(true);
        } else if (type === 'DELETE_COMMENT') {
            setComments(prev => prev.filter(c => c.id !== targetId));
            await ProjectService.deleteProjectComment(targetId);
        }
    };

    const calculateProgress = (tasks: Task[]) => {
        if (tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.isCompleted).length;
        return Math.round((completed / tasks.length) * 100);
    };

    const openInMaps = (location: string) => {
        window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(location)}`, '_blank');
    };

    if (!activeProject) return null;

    const isSong = activeProject.type === 'SONG';
    const isEventOrRehearsal = activeProject.type === 'EVENT' || activeProject.type === 'REHEARSAL';

    return createPortal(
        <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col animate-fade-in touch-none">
             {/* Header */}
             <div className="p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] flex items-center justify-between border-b border-zinc-900 bg-zinc-950 z-20">
                  <button onClick={onClose} className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full">
                      <ChevronRight className="rotate-180" size={24} />
                  </button>
                  
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
                                <button onClick={() => setIsEditingProject(false)} className="p-2 text-zinc-500 hover:text-white">
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
                    <button onClick={requestDeleteProject} className="p-2 text-zinc-600 hover:text-red-500">
                        <Trash2 size={20} />
                    </button>
                  </div>
             </div>

             {/* Content */}
             <div className={`flex-1 overflow-y-auto p-5 ${isSong ? 'pb-32' : 'pb-5'}`}>
                  
                  {isEventOrRehearsal && (
                      <div className="space-y-6">
                          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                <div className="flex gap-4">
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
                                        >
                                            <Navigation size={18} />
                                        </button>
                                    )}
                                </div>
                          </div>

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
                                      placeholder="Напишите здесь..."
                                  />
                              ) : (
                                  <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                      {activeProject.description || <span className="text-zinc-600 italic">Нет описания</span>}
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

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
                                  onTouchStart={(e) => handleTouchStart(e, task.id)}
                                  onTouchMove={handleTouchMove}
                                  onTouchEnd={handleTouchEnd}
                               >
                                   <div className="flex items-center justify-center text-zinc-700 cursor-grab active:cursor-grabbing touch-none" style={{ touchAction: 'none' }}>
                                        <GripVertical size={20} />
                                   </div>
                                   <button onClick={() => handleToggleTask(task)} className="mt-1 shrink-0">
                                       {task.isCompleted ? <CheckCircle className="text-green-500" size={20} /> : <Circle className="text-zinc-600 group-hover:text-zinc-400" size={20} />}
                                   </button>
                                   <div className="flex-1 min-w-0">
                                       <div className={`font-medium break-words ${task.isCompleted ? 'text-zinc-500 line-through' : 'text-white'}`}>{task.title}</div>
                                       <div className="mt-2 flex flex-wrap gap-2 items-center">
                                           {task.linkUrl && (
                                               <a 
                                                href={task.linkUrl.startsWith('http') ? task.linkUrl : `https://${task.linkUrl}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/20"
                                               >
                                                   <ExternalLink size={10} /> Открыть
                                               </a>
                                           )}
                                           <button onClick={() => { setEditingLinkTask(task.id); setLinkUrlInput(task.linkUrl || ''); }} className="text-[10px] text-zinc-600 hover:text-white flex items-center gap-1">
                                               <LinkIcon size={10} /> {task.linkUrl ? 'Изм. ссылку' : 'Ссылка'}
                                           </button>
                                           <button onClick={() => handleDeleteTask(task.id)} className="ml-auto text-zinc-700 hover:text-red-500">
                                               <Trash2 size={12} />
                                           </button>
                                       </div>
                                       {editingLinkTask === task.id && (
                                           <div className="mt-2 flex gap-2 animate-fade-in">
                                               <input 
                                                type="text" 
                                                placeholder="https://..." 
                                                value={linkUrlInput}
                                                onChange={e => setLinkUrlInput(e.target.value)}
                                                className="flex-1 bg-black border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                               />
                                               <button onClick={() => handleSaveLink(task.id)} className="bg-indigo-600 px-3 rounded-lg text-white text-xs font-bold">OK</button>
                                               <button onClick={() => setEditingLinkTask(null)} className="text-zinc-500"><X size={14} /></button>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           ))}
                      </div>
                  )}

                  <div className="mt-8 mb-4">
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
                                           {comment.userAvatar ? <img src={comment.userAvatar} className="w-full h-full object-cover" /> : <div className="text-[10px] font-bold text-zinc-500">{comment.userName.charAt(0)}</div>}
                                       </div>
                                       <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                                                {comment.content}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 px-1">
                                                <span className="text-[10px] text-zinc-600">{comment.userName} • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                {isMe && <button onClick={() => requestDeleteComment(comment.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={10} /></button>}
                                            </div>
                                       </div>
                                   </div>
                               );
                           })}
                           <div ref={messagesEndRef} />
                       </div>
                       <form onSubmit={handleSendComment} className="flex gap-2">
                           <input 
                            type="text" 
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Написать..."
                            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                           />
                           <button disabled={!newComment.trim()} type="submit" className="bg-indigo-600 w-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"><Send size={20} /></button>
                       </form>
                  </div>
                  <div className="h-20"></div>
             </div>

             {isSong && (
                 <form onSubmit={handleAddTask} className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                     <div className="flex gap-2">
                         <input
                           type="text"
                           placeholder="Добавить задачу..."
                           value={newTaskTitle}
                           onChange={e => setNewTaskTitle(e.target.value)}
                           className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none"
                         />
                         <button type="submit" disabled={!newTaskTitle} className="bg-purple-600 w-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"><Plus size={24} /></button>
                     </div>
                 </form>
             )}

             {confirmState.isOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
                    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-slide-up">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4"><AlertTriangle size={32} /></div>
                            <h3 className="text-xl font-bold text-white mb-2">{confirmState.title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">{confirmState.message}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-3 bg-zinc-800 rounded-xl font-bold text-zinc-400 hover:text-white">Отмена</button>
                            <button onClick={executeAction} className="flex-1 py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700">Удалить</button>
                        </div>
                    </div>
                </div>
             )}
        </div>,
        document.body
    );
}
