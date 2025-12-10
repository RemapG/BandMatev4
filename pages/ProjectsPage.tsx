
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { ProjectService } from '../services/storage';
import { Project, Task, ProjectType } from '../types';
import { FolderKanban, Plus, Music, Calendar, Clock, MapPin, Mic } from 'lucide-react';
import ProjectDetailsModal from '../components/ProjectDetailsModal';

export default function ProjectsPage() {
  const { currentBand, projects, projectsLoading, refreshProjects } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  
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
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Handle URL Params for Deep Linking
  useEffect(() => {
      const projectId = searchParams.get('id');
      if (projectId && projects.length > 0) {
          const target = projects.find(p => p.id === projectId);
          if (target) {
              setActiveProjectId(target.id);
              setActiveTab(target.type);
          }
      }
  }, [projects, searchParams]);

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
      
      refreshProjects(true);
  };

  const openCreateModal = () => {
      setNewType(activeTab); // Default to current tab
      setIsCreating(true);
  };

  const handleOpenProject = (id: string) => {
      setActiveProjectId(id);
      setSearchParams({ id });
  };

  const handleCloseProject = () => {
      setActiveProjectId(null);
      setSearchParams({});
  };

  const calculateProgress = (tasks: Task[]) => {
      if (tasks.length === 0) return 0;
      const completed = tasks.filter(t => t.isCompleted).length;
      return Math.round((completed / tasks.length) * 100);
  };

  const filteredProjects = projects.filter(p => p.type === activeTab && p.status === 'IN_PROGRESS');

  if (!currentBand) return null;

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

        {projectsLoading && projects.length === 0 ? (
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
                        icon = <Mic size={20} />; // Changed from Mic2
                        typeLabel = 'Репетиция';
                        colorClass = 'bg-green-500/10 text-green-400';
                        bgIcon = <Mic size={80} />; // Changed from Mic2
                    }

                    return (
                        <button
                            key={project.id}
                            onClick={() => handleOpenProject(project.id)}
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

                            {project.type === 'SONG' && (
                                <p className="text-zinc-500 text-xs mb-4 relative z-10">{project.tasks.length} задач</p>
                            )}
                            
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

        <ProjectDetailsModal 
            projectId={activeProjectId} 
            onClose={handleCloseProject}
        />
    </div>
  );
}
