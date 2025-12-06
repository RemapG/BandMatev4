
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { ProjectService } from '../services/storage';
import { Project, Task, ProjectType } from '../types';
import { FolderKanban, Plus, Music, Calendar, ChevronRight, X, CheckCircle, Circle, Link as LinkIcon, ExternalLink, Trash2, Mic2 } from 'lucide-react';

export default function ProjectsPage() {
  const { currentBand } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Project Modal
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ProjectType>('SONG');

  // Active Project View
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  
  // Create Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Edit Link State
  const [editingLinkTask, setEditingLinkTask] = useState<string | null>(null);
  const [linkUrlInput, setLinkUrlInput] = useState('');

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

  const handleCreateProject = async () => {
      if (!currentBand || !newTitle) return;
      await ProjectService.createProject(currentBand.id, newTitle, newType);
      setIsCreating(false);
      setNewTitle('');
      fetchProjects();
  };

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

  const handleDeleteProject = async (id: string) => {
      if (confirm('Удалить этот проект?')) {
          await ProjectService.deleteProject(id);
          setActiveProject(null);
          fetchProjects();
      }
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

  const calculateProgress = (tasks: Task[]) => {
      if (tasks.length === 0) return 0;
      const completed = tasks.filter(t => t.isCompleted).length;
      return Math.round((completed / tasks.length) * 100);
  };

  if (!currentBand) return null;

  return (
    // Updated padding: p-5 on mobile, md:p-10 on desktop
    <div className="h-full flex flex-col p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-10 pb-24">
        <header className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Проекты</h2>
                <div className="h-1 w-12 bg-purple-500 mt-1 rounded-full"></div>
            </div>
            <button 
                onClick={() => setIsCreating(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-2xl shadow-lg shadow-purple-900/40 active:scale-95 transition-all"
            >
                <Plus size={24} />
            </button>
        </header>

        {loading ? (
             <div className="flex-1 flex items-center justify-center">
                 <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
             </div>
        ) : projects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/20">
                <FolderKanban size={48} className="mb-4 opacity-50" />
                <p>Нет активных проектов</p>
                <button onClick={() => setIsCreating(true)} className="text-purple-400 text-sm font-bold mt-2">Создать первый</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-4">
                {projects.map(project => {
                    const progress = calculateProgress(project.tasks);
                    return (
                        <button
                            key={project.id}
                            onClick={() => setActiveProject(project)}
                            className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-left hover:bg-zinc-800 transition-all active:scale-[0.99] group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                {project.type === 'SONG' ? <Mic2 size={80} /> : <Calendar size={80} />}
                            </div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    project.type === 'SONG' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-orange-500/10 text-orange-400'
                                }`}>
                                    {project.type === 'SONG' ? <Music size={20} /> : <Calendar size={20} />}
                                </div>
                                <div className="bg-zinc-800 px-2 py-1 rounded text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                                    {project.type === 'SONG' ? 'Песня' : 'Событие'}
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-1 relative z-10">{project.title}</h3>
                            <p className="text-zinc-500 text-xs mb-4 relative z-10">{project.tasks.length} задач</p>

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
                        </button>
                    );
                })}
            </div>
        )}

        {/* CREATE MODAL */}
        {isCreating && createPortal(
            <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
                 <div className="bg-zinc-900 border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-12 sm:pb-6 shadow-2xl relative animate-slide-up">
                      <h3 className="text-xl font-bold text-white mb-6">Новый проект</h3>
                      <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Название (напр. Новый Альбом)"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none"
                          />
                          <div className="flex gap-3">
                              <button 
                                onClick={() => setNewType('SONG')}
                                className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 ${
                                    newType === 'SONG' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                                }`}
                              >
                                  <Music size={18} /> Песня/Альбом
                              </button>
                              <button 
                                onClick={() => setNewType('EVENT')}
                                className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 ${
                                    newType === 'EVENT' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                                }`}
                              >
                                  <Calendar size={18} /> Концерт
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
                 <div className="p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] flex items-center justify-between border-b border-zinc-900">
                      <button onClick={() => setActiveProject(null)} className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full">
                          <ChevronRight className="rotate-180" size={24} />
                      </button>
                      <span className="font-bold text-white truncate max-w-[200px]">{activeProject.title}</span>
                      <button onClick={() => handleDeleteProject(activeProject.id)} className="p-2 -mr-2 text-zinc-600 hover:text-red-500">
                          <Trash2 size={20} />
                      </button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-5 pb-32">
                      <div className="mb-6">
                           <div className="flex justify-between items-center mb-2">
                               <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Прогресс</span>
                               <span className="text-white font-mono font-bold">{calculateProgress(activeProject.tasks)}%</span>
                           </div>
                           <div className="h-1 bg-zinc-900 rounded-full">
                               <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${calculateProgress(activeProject.tasks)}%` }}></div>
                           </div>
                      </div>

                      <div className="space-y-3">
                           {activeProject.tasks.map(task => (
                               <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-3 group">
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

                      <div className="h-20"></div> {/* Spacer */}
                 </div>

                 {/* Add Task Footer */}
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
            </div>,
            document.body
        )}
    </div>
  );
}
