import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager, TextInput } from 'react-native';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useMobileCounters } from '../../store/mobileCounters';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Project {
  id: string;
  name: string;
  code?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  projectId: string;
  updatedAt: any;
}

interface JournalProject {
  projectId: string;
  name: string;
  pmNotes?: string;
  conclusions?: string;
  nextSteps?: string;
  status?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  tenantId: string;
  projects: JournalProject[];
  createdAt?: any;
}

interface ProjectUpdate {
  id: string;
  date: string;
  pmNotes: string;
  conclusions: string;
  nextSteps: string;
}

export default function ProjectsScreen() {
  const { tenantId, assignedProjectIds, role, roleLevel, loading: countersLoading } = useMobileCounters();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingJournal, setLoadingJournal] = useState(true);
  
  const [viewMode, setViewMode] = useState<'tasks' | 'feed'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Helper to format Date string like YYYY-MM-DD to Spanish long format
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      const weekday = weekdays[date.getDay()];
      const monthName = months[date.getMonth()];
      
      return `${weekday}, ${day} de ${monthName} de ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // 1. Listen to projects in tenant
  useEffect(() => {
    if (!tenantId) return;

    setLoadingProjects(true);
    const qProjs = query(
      collection(db, 'projects'),
      where('tenantId', '==', tenantId),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(qProjs, (snapshot) => {
      const projsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      // Filter by privileges: superadmin/app_admin/roleLevel >= 80 see all, others see only assigned
      const isPrivileged = role === 'superadmin' || role === 'app_admin' || roleLevel >= 80;
      const allowedProjects = projsData.filter(p => {
        if (isPrivileged) return true;
        return assignedProjectIds?.includes(p.id);
      });

      // Sort alphabetically by name
      allowedProjects.sort((a, b) => a.name.localeCompare(b.name));

      setProjects(allowedProjects);
      setLoadingProjects(false);
    }, (error) => {
      console.error('Error fetching projects:', error);
      setLoadingProjects(false);
    });

    return unsubscribe;
  }, [tenantId, assignedProjectIds, role, roleLevel]);

  // 2. Listen to tasks in tenant
  useEffect(() => {
    if (!tenantId) return;

    setLoadingTasks(true);
    const qTasks = query(
      collection(db, 'tasks'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(qTasks, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      // Sort client-side by updatedAt descending
      const sortedTasks = allTasks.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });

      // Filter by status (pending, in_progress, review)
      const activeTasks = sortedTasks.filter(task =>
        ['pending', 'in_progress', 'review'].includes(task.status)
      );

      setTasks(activeTasks);
      setLoadingTasks(false);
    }, (error) => {
      console.error('Error fetching tasks:', error);
      setLoadingTasks(false);
    });

    return unsubscribe;
  }, [tenantId]);

  // 3. Listen to journal entries in tenant
  useEffect(() => {
    if (!tenantId) return;

    setLoadingJournal(true);
    const qJournal = query(
      collection(db, 'journal_entries'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(qJournal, (snapshot) => {
      const journalData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JournalEntry[];

      // Sort by date descending
      journalData.sort((a, b) => b.date.localeCompare(a.date));

      setJournalEntries(journalData);
      setLoadingJournal(false);
    }, (error) => {
      console.error('Error fetching journal entries:', error);
      setLoadingJournal(false);
    });

    return unsubscribe;
  }, [tenantId]);

  const toggleProject = (projectId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const getFilteredTasksForProject = (projectId: string, projectName: string) => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    if (!searchQuery) return projectTasks;

    const lowerQ = searchQuery.toLowerCase();
    if (projectName.toLowerCase().includes(lowerQ)) {
      return projectTasks;
    }

    return projectTasks.filter(task =>
      task.title && task.title.toLowerCase().includes(lowerQ)
    );
  };

  const getUpdatesForProject = (projectId: string, projectName: string) => {
    const list: ProjectUpdate[] = [];

    journalEntries.forEach(entry => {
      const projEntry = entry.projects?.find(p =>
        p.projectId === projectId ||
        (p.name && p.name.trim().toLowerCase() === projectName.trim().toLowerCase())
      );

      if (projEntry && projEntry.status !== 'trash') {
        const pmNotes = projEntry.pmNotes || '';
        const conclusions = projEntry.conclusions || '';
        const nextSteps = projEntry.nextSteps || '';

        if (pmNotes.trim().length > 0 || conclusions.trim().length > 0 || nextSteps.trim().length > 0) {
          list.push({
            id: `${entry.id}-${projectId}`,
            date: entry.date,
            pmNotes,
            conclusions,
            nextSteps
          });
        }
      }
    });

    if (!searchQuery) return list;

    const lowerQ = searchQuery.toLowerCase();
    if (projectName.toLowerCase().includes(lowerQ)) {
      return list;
    }

    return list.filter(u =>
      u.date.toLowerCase().includes(lowerQ) ||
      u.pmNotes.toLowerCase().includes(lowerQ) ||
      u.conclusions.toLowerCase().includes(lowerQ) ||
      u.nextSteps.toLowerCase().includes(lowerQ)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'review':
        return { bg: '#fef3c7', text: '#d97706' }; // Amber
      case 'in_progress':
        return { bg: '#dbeafe', text: '#2563eb' }; // Blue
      case 'pending':
      default:
        return { bg: '#f3f4f6', text: '#4b5563' }; // Gray
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'review':
        return 'En Revisión';
      case 'in_progress':
        return 'En Progreso';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  if (loadingProjects || loadingTasks || loadingJournal || countersLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color="#4f46e5" />;
  }

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* Toggle between Tareas and Feed */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'tasks' && styles.toggleActiveButton]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setViewMode('tasks');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkbox-outline"
              size={18}
              color={viewMode === 'tasks' ? '#fff' : '#4b5563'}
              style={styles.toggleIcon}
            />
            <Text style={[styles.toggleText, viewMode === 'tasks' && styles.toggleActiveText]}>
              Tareas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'feed' && styles.toggleActiveButton]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setViewMode('feed');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={viewMode === 'feed' ? '#fff' : '#4b5563'}
              style={styles.toggleIcon}
            />
            <Text style={[styles.toggleText, viewMode === 'feed' && styles.toggleActiveText]}>
              Feed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={viewMode === 'tasks' ? "Buscar tareas o proyectos..." : "Buscar en feed o proyectos..."}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isExpanded = expandedProjects[item.id] ?? false;

          if (viewMode === 'tasks') {
            const projectTasks = getFilteredTasksForProject(item.id, item.name);
            if (projectTasks.length === 0) return null; // Hide projects with no matching tasks

            return (
              <View style={styles.projectSection}>
                <TouchableOpacity
                  style={styles.projectHeader}
                  onPress={() => toggleProject(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.projectInfo}>
                    <Ionicons name="clipboard-outline" size={20} color="#4f46e5" style={styles.projectIcon} />
                    <View style={styles.projectNameContainer}>
                      <Text style={styles.projectName}>{item.name}</Text>
                      {item.code ? <Text style={styles.projectCode}>{item.code}</Text> : null}
                    </View>
                  </View>
                  <View style={styles.projectActions}>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{projectTasks.length}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#4b5563"
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.tasksList}>
                    {projectTasks.map(task => {
                      const statusStyle = getStatusColor(task.status);
                      return (
                        <View key={task.id} style={styles.taskCard}>
                          <Text style={styles.taskTitle}>{task.title || 'Sin título'}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.statusText, { color: statusStyle.text }]}>
                              {getStatusLabel(task.status)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          } else {
            const projectUpdates = getUpdatesForProject(item.id, item.name);
            if (projectUpdates.length === 0) return null; // Hide projects with no matching updates

            return (
              <View style={styles.projectSection}>
                <TouchableOpacity
                  style={styles.projectHeader}
                  onPress={() => toggleProject(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.projectInfo}>
                    <Ionicons name="newspaper-outline" size={20} color="#06b6d4" style={styles.projectIcon} />
                    <View style={styles.projectNameContainer}>
                      <Text style={styles.projectName}>{item.name}</Text>
                      {item.code ? <Text style={styles.projectCode}>{item.code}</Text> : null}
                    </View>
                  </View>
                  <View style={styles.projectActions}>
                    <View style={[styles.countBadge, { backgroundColor: '#e0f7fa' }]}>
                      <Text style={[styles.countBadgeText, { color: '#00838f' }]}>{projectUpdates.length}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#4b5563"
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.feedList}>
                    {projectUpdates.map(update => {
                      const formattedDate = formatDate(update.date);
                      const steps = update.nextSteps ? update.nextSteps.split('\n').filter(s => s.trim().length > 0) : [];

                      return (
                        <View key={update.id} style={styles.feedCard}>
                          <View style={styles.feedCardHeader}>
                            <Ionicons name="calendar-outline" size={14} color="#6b7280" style={styles.calendarIcon} />
                            <Text style={styles.feedDate}>{formattedDate}</Text>
                          </View>

                          {update.pmNotes.trim().length > 0 && (
                            <View style={styles.feedSection}>
                              <Text style={styles.feedSectionTitle}>Notas del PM</Text>
                              <Text style={styles.feedSectionText}>{update.pmNotes}</Text>
                            </View>
                          )}

                          {update.conclusions.trim().length > 0 && (
                            <View style={styles.feedSection}>
                              <Text style={styles.feedSectionTitle}>Conclusiones</Text>
                              <Text style={styles.feedSectionText}>{update.conclusions}</Text>
                            </View>
                          )}

                          {steps.length > 0 && (
                            <View style={styles.feedSection}>
                              <Text style={styles.feedSectionTitle}>Próximos Pasos</Text>
                              <View style={styles.stepsList}>
                                {steps.map((step, idx) => (
                                  <View key={idx} style={styles.stepRow}>
                                    <View style={styles.stepBullet} />
                                    <Text style={styles.stepText}>{step}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          }
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {searchQuery
              ? "No se encontraron resultados para tu búsqueda."
              : (viewMode === 'tasks'
                ? "No tienes tareas activas en ningún proyecto activo."
                : "No hay actualizaciones en ningún proyecto activo.")}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  toggleActiveButton: {
    backgroundColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleIcon: {
    marginRight: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  toggleActiveText: {
    color: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    padding: 0, // Reset default Android paddings
  },
  clearButton: {
    padding: 4,
  },
  projectSection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  projectIcon: {
    marginRight: 12,
  },
  projectNameContainer: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  projectCode: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  projectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338ca',
  },
  tasksList: {
    padding: 12,
    backgroundColor: '#f9fafb',
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  taskTitle: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedList: {
    padding: 12,
    backgroundColor: '#f9fafb',
    gap: 12,
  },
  feedCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  calendarIcon: {
    marginRight: 6,
  },
  feedDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  feedSection: {
    gap: 4,
  },
  feedSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  feedSectionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  stepsList: {
    gap: 6,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4f46e5',
    marginTop: 7,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    marginHorizontal: 20,
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  }
});
