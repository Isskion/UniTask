import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MarkdownNote } from '../../components/MarkdownNote';
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

interface UniLeakFolder {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string;
  tenantId: string;
  createdAt: any;
  updatedAt: any;
}

interface UniLeaksNote {
  id: string;
  title: string;
  content: string;
  projectId: string;
  tenantId: string;
  userId: string;
  isPublic: boolean;
  isInternal?: boolean;
  folderId?: string | null;
  createdAt: any;
  updatedAt: any;
}

export default function LeaksScreen() {
  const { tenantId, assignedProjectIds, role, roleLevel, loading: countersLoading } = useMobileCounters();
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<UniLeaksNote[]>([]);
  const [folders, setFolders] = useState<UniLeakFolder[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedNote, setSelectedNote] = useState<UniLeaksNote | null>(null);

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

  // 2. Listen to notes in tenant
  useEffect(() => {
    if (!tenantId) return;

    setLoadingNotes(true);
    const qNotes = query(
      collection(db, 'unileaks_notes'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(qNotes, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UniLeaksNote[];

      // Sort notes globally by updatedAt descending
      notesData.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setNotes(notesData);
      setLoadingNotes(false);
    }, (error) => {
      console.error('Error fetching notes:', error);
      setLoadingNotes(false);
    });

    return unsubscribe;
  }, [tenantId]);

  // 3. Listen to folders in tenant
  useEffect(() => {
    if (!tenantId) return;

    setLoadingFolders(true);
    const qFolders = query(
      collection(db, 'unileaks_folders'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(qFolders, (snapshot) => {
      const foldersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UniLeakFolder[];

      setFolders(foldersData);
      setLoadingFolders(false);
    }, (error) => {
      console.error('Error fetching folders:', error);
      setLoadingFolders(false);
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

  const toggleFolder = (folderId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const getNotesForProject = (projectId: string) => {
    return notes.filter(note => note.projectId === projectId);
  };

  // Recursive Tree Rendering of notes and folders for a specific project
  const renderProjectTree = (projectId: string, parentId: string | null = null, depth: number = 0) => {
    // Filter folders for this project and parent
    const projectFolders = folders
      .filter(f => f.projectId === projectId && (f.parentId || null) === parentId)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    // Filter notes for this project and parent
    const projectNotes = notes
      .filter(n => n.projectId === projectId && (n.folderId || null) === parentId)
      .sort((a, b) => {
        const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

    if (projectFolders.length === 0 && projectNotes.length === 0) {
      if (depth > 0) {
        return (
          <View style={[styles.emptyFolder, { paddingLeft: depth * 16 + 12 }]}>
            <Text style={styles.emptyFolderText}>Carpeta vacía</Text>
          </View>
        );
      }
      return null;
    }

    return (
      <View style={styles.treeContainer}>
        {/* Render notes first, matching the web sidebar logic */}
        {projectNotes.map(note => (
          <TouchableOpacity 
            key={`note-${note.id}`} 
            style={[styles.noteTitleButton, { paddingLeft: depth * 16 + 14 }]}
            onPress={() => setSelectedNote(note)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={18} color="#4b5563" style={styles.noteButtonIcon} />
            <Text style={styles.noteButtonText} numberOfLines={1}>
              {note.title || 'Sin título'}
            </Text>
            {note.isPublic ? (
              <Ionicons name="globe-outline" size={14} color="#10b981" style={{ marginRight: 6 }} />
            ) : note.isInternal ? (
              <Ionicons name="people-outline" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="lock-closed-outline" size={14} color="#6b7280" style={{ marginRight: 6 }} />
            )}
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        {/* Render folders recursively */}
        {projectFolders.map(folder => {
          const isFolderExpanded = expandedFolders[folder.id] ?? false;
          return (
            <View key={`folder-${folder.id}`} style={styles.folderSection}>
              <TouchableOpacity 
                style={[styles.folderHeader, { paddingLeft: depth * 16 + 12 }]} 
                onPress={() => toggleFolder(folder.id)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isFolderExpanded ? "folder-open" : "folder"} 
                  size={18} 
                  color="#4f46e5" 
                  style={styles.folderIcon} 
                />
                <Text style={styles.folderName} numberOfLines={1}>
                  {folder.name}
                </Text>
                <Ionicons 
                  name={isFolderExpanded ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
              {isFolderExpanded && renderProjectTree(projectId, folder.id, depth + 1)}
            </View>
          );
        })}
      </View>
    );
  };

  if (loadingProjects || loadingNotes || loadingFolders || countersLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color="#4f46e5" />;
  }

  // If a note is selected, render the detail view
  if (selectedNote) {
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setSelectedNote(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#4f46e5" />
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>
            {selectedNote.title || 'Nota'}
          </Text>
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailTitle}>{selectedNote.title || 'Sin título'}</Text>
          <MarkdownNote content={selectedNote.content} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const projectNotes = getNotesForProject(item.id);
          if (projectNotes.length === 0) return null; // Hide empty projects
          
          const isExpanded = expandedProjects[item.id] ?? false;

          return (
            <View style={styles.projectSection}>
              <TouchableOpacity 
                style={styles.projectHeader} 
                onPress={() => toggleProject(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.projectInfo}>
                  <Ionicons name="folder-open-outline" size={20} color="#4f46e5" style={styles.projectIcon} />
                  <View>
                    <Text style={styles.projectName}>{item.name}</Text>
                    {item.code ? <Text style={styles.projectCode}>{item.code}</Text> : null}
                  </View>
                </View>
                <View style={styles.projectActions}>
                  <View style={styles.notesCountBadge}>
                    <Text style={styles.notesCountText}>{projectNotes.length}</Text>
                  </View>
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#4b5563" 
                  />
                </View>
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.notesList}>
                  {renderProjectTree(item.id, null, 0)}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No tienes acceso a ningún proyecto con notas.</Text>}
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
  },
  projectIcon: {
    marginRight: 12,
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
  notesCountBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  notesCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338ca',
  },
  notesList: {
    padding: 8,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  noteTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 2,
  },
  noteButtonIcon: {
    marginRight: 10,
  },
  noteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  treeContainer: {
    width: '100%',
    gap: 4,
  },
  folderSection: {
    width: '100%',
    marginTop: 4,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  folderIcon: {
    marginRight: 10,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  emptyFolder: {
    paddingVertical: 8,
    justifyContent: 'center',
    marginTop: 2,
  },
  emptyFolderText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  detailContent: {
    flex: 1,
    paddingTop: 16,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 8,
  }
});
