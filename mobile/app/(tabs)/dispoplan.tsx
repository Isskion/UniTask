import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { collection, query, onSnapshot, where, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useMobileCounters } from '../../store/mobileCounters';
import { Ionicons } from '@expo/vector-icons';

type AvailabilityType = 'vacation' | 'sick_leave' | 'public_holiday' | 'personal_days' | 'training' | 'remote_work' | 'other';
type AvailabilityStatus = 'pending' | 'approved' | 'rejected';

interface UserAvailability {
  id: string;
  tenantId: string;
  userId: string;
  type: AvailabilityType;
  startDate: any;
  endDate: any;
  status: AvailabilityStatus;
  notes?: string;
  consumedDays?: number;
  createdBy: string;
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
}

const AVAILABILITY_TYPES: Record<AvailabilityType, { label: string; color: string; icon: any }> = {
  vacation: { label: "Vacaciones", color: "#10b981", icon: "umbrella-outline" },
  sick_leave: { label: "Baja Médica", color: "#ef4444", icon: "heart-outline" },
  public_holiday: { label: "Festivo", color: "#f59e0b", icon: "calendar-outline" },
  personal_days: { label: "Asuntos Propios", color: "#3b82f6", icon: "person-outline" },
  training: { label: "Formación", color: "#8b5cf6", icon: "book-outline" },
  remote_work: { label: "Teletrabajo", color: "#06b6d4", icon: "home-outline" },
  other: { label: "Otro", color: "#71717a", icon: "ellipsis-horizontal-outline" }
};

export default function DispoPlanScreen() {
  const { tenantId, role, roleLevel, userId } = useMobileCounters();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [availabilities, setAvailabilities] = useState<UserAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [formUserId, setFormUserId] = useState('');
  const [formType, setFormType] = useState<AvailabilityType>('vacation');
  
  const getTodayStr = (offset = 0) => {
    const d = new Date();
    if (offset > 0) {
      d.setDate(d.getDate() + offset);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDateStr, setStartDateStr] = useState(getTodayStr(0));
  const [endDateStr, setEndDateStr] = useState(getTodayStr(0));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);

  const userLevel = roleLevel || 0;
  const isManager = userLevel >= 60; // pm or above

  // Pre-fill user ID
  useEffect(() => {
    if (userId) {
      setFormUserId(userId);
    }
  }, [userId]);

  // Format date helper
  const formatDate = (dateValue: any) => {
    if (!dateValue) return '';
    try {
      let date: Date;
      if (dateValue.toDate) {
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        date = new Date(dateValue);
      }
      
      const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      return `${weekdays[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return String(dateValue);
    }
  };

  // Listen to users in tenant
  useEffect(() => {
    if (!tenantId) return;

    const qUsers = query(
      collection(db, 'users'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName || doc.data().email || 'Usuario',
        email: doc.data().email || ''
      })) as UserProfile[];

      usersData.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(usersData);
    }, (error) => {
      console.error('Error fetching users:', error);
    });

    return unsubscribe;
  }, [tenantId]);

  // Listen to availabilities in tenant
  useEffect(() => {
    if (!tenantId) return;

    const qAvail = query(
      collection(db, 'user_availability'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(qAvail, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserAvailability[];

      // Sort by startDate descending
      data.sort((a, b) => {
        const timeA = a.startDate?.seconds || new Date(a.startDate).getTime() || 0;
        const timeB = b.startDate?.seconds || new Date(b.startDate).getTime() || 0;
        return timeB - timeA;
      });

      setAvailabilities(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching availabilities:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [tenantId]);

  // Date manipulation helpers
  const handleQuickStartDate = (offset: number, nextMonday = false) => {
    if (nextMonday) {
      const d = new Date();
      const day = d.getDay();
      const diff = (day === 0 ? 1 : 8 - day);
      setStartDateStr(getTodayStr(diff));
    } else {
      setStartDateStr(getTodayStr(offset));
    }
  };

  const handleQuickEndDate = (days: number) => {
    try {
      const [year, month, day] = startDateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const rday = String(d.getDate()).padStart(2, '0');
      setEndDateStr(`${y}-${m}-${rday}`);
    } catch (e) {
      // noop
    }
  };

  const handleRegister = async () => {
    if (!formUserId) {
      Alert.alert("Error", "Por favor seleccione un recurso.");
      return;
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (start > end) {
      Alert.alert("Error", "La fecha de inicio no puede ser posterior a la de fin.");
      return;
    }

    setSaving(true);
    try {
      const loggedInUid = auth.currentUser?.uid || userId || '';
      
      await addDoc(collection(db, "user_availability"), {
        tenantId: tenantId || '1',
        userId: formUserId,
        type: formType,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        status: 'approved',
        notes: notes.trim(),
        consumedDays: 0,
        createdBy: loggedInUid,
        createdAt: Timestamp.now()
      });

      if (Platform.OS === 'web') {
        alert(`${AVAILABILITY_TYPES[formType].label} registrado con éxito.`);
      } else {
        Alert.alert("Éxito", `${AVAILABILITY_TYPES[formType].label} registrado con éxito.`);
      }

      // Reset dates & notes
      setStartDateStr(getTodayStr(0));
      setEndDateStr(getTodayStr(0));
      setNotes('');
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "No se pudo registrar la ausencia: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, typeLabel: string) => {
    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, 'user_availability', id));
        if (Platform.OS === 'web') {
          alert('Registro eliminado correctamente.');
        } else {
          Alert.alert("Éxito", "Registro eliminado correctamente.");
        }
      } catch (err: any) {
        console.error(err);
        Alert.alert("Error", "No se pudo eliminar: " + err.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Estás seguro de eliminar este registro de ${typeLabel}?`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Eliminar Registro",
        `¿Estás seguro de eliminar este registro de ${typeLabel}?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: performDelete }
        ]
      );
    }
  };

  // Filter visible availabilities for display
  const visibleAvailabilities = availabilities.filter(item => {
    if (isManager) return true;
    return item.userId === userId;
  });

  if (loading) {
    return <ActivityIndicator style={styles.loader} size="large" color="#4f46e5" />;
  }

  const selectedUser = users.find(u => u.uid === formUserId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar-outline" size={20} color="#4f46e5" />
          <Text style={styles.cardTitle}>Carga Rápida de Ausencias</Text>
        </View>

        {/* Resource Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Recurso</Text>
          {isManager ? (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity 
                style={styles.dropdownSelector}
                onPress={() => setShowUsersDropdown(!showUsersDropdown)}
              >
                <Text style={styles.dropdownSelectorText}>
                  {selectedUser ? selectedUser.displayName : "Seleccionar recurso..."}
                </Text>
                <Ionicons name={showUsersDropdown ? "chevron-up" : "chevron-down"} size={16} color="#4b5563" />
              </TouchableOpacity>
              
              {showUsersDropdown && (
                <View style={styles.dropdownList}>
                  {users.map(u => (
                    <TouchableOpacity
                      key={u.uid}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormUserId(u.uid);
                        setShowUsersDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{u.displayName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={selectedUser ? selectedUser.displayName : (auth.currentUser?.email || "Mi Perfil")}
              editable={false}
            />
          )}
        </View>

        {/* Type selector (Grid of buttons) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de Ausencia</Text>
          <View style={styles.typeGrid}>
            {Object.entries(AVAILABILITY_TYPES).map(([key, config]) => {
              const isSelected = formType === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.typeButton,
                    { borderColor: config.color },
                    isSelected && { backgroundColor: config.color }
                  ]}
                  onPress={() => setFormType(key as AvailabilityType)}
                >
                  <Ionicons 
                    name={config.icon} 
                    size={14} 
                    color={isSelected ? '#fff' : config.color} 
                  />
                  <Text 
                    style={[
                      styles.typeButtonText, 
                      { color: config.color },
                      isSelected && { color: '#fff' }
                    ]}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Start Date */}
        <View style={styles.formGroup}>
          <View style={styles.dateLabelRow}>
            <Text style={styles.label}>Desde</Text>
            <View style={styles.quickButtons}>
              <TouchableOpacity onPress={() => handleQuickStartDate(0)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>Hoy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleQuickStartDate(1)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>Mañ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleQuickStartDate(0, true)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>Lun</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={startDateStr}
            onChangeText={setStartDateStr}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* End Date */}
        <View style={styles.formGroup}>
          <View style={styles.dateLabelRow}>
            <Text style={styles.label}>Hasta</Text>
            <View style={styles.quickButtons}>
              <TouchableOpacity onPress={() => handleQuickEndDate(0)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>= Ini</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleQuickEndDate(4)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>+5d</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleQuickEndDate(9)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>+10d</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={endDateStr}
            onChangeText={setEndDateStr}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Notas / Motivo</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Opcional..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={saving || !formUserId}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.registerButtonText}>Registrar Ausencia</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* List of Registered Absences */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>
          {isManager ? "Registros en el Tenant" : "Mis Registros"} ({visibleAvailabilities.length})
        </Text>
        
        {visibleAvailabilities.length === 0 ? (
          <Text style={styles.emptyText}>No hay ausencias registradas.</Text>
        ) : (
          visibleAvailabilities.map(item => {
            const config = AVAILABILITY_TYPES[item.type] || { label: "Ausencia", color: "#71717a", icon: "help-circle-outline" };
            const u = users.find(usr => usr.uid === item.userId);
            const userDisp = u ? u.displayName : "Cargando...";
            const canDelete = isManager || userId === item.userId || auth.currentUser?.uid === item.userId;

            return (
              <View key={item.id} style={styles.absenceCard}>
                <View style={styles.absenceCardContent}>
                  <View style={styles.absenceHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: config.color }]}>
                      <Ionicons name={config.icon} size={12} color="#fff" />
                      <Text style={styles.typeBadgeText}>{config.label}</Text>
                    </View>
                    {isManager && (
                      <Text style={styles.absenceUser} numberOfLines={1}>
                        {userDisp}
                      </Text>
                    )}
                  </View>
                  
                  <Text style={styles.absenceDates}>
                    {formatDate(item.startDate)} → {formatDate(item.endDate)}
                  </Text>
                  
                  {item.notes ? (
                    <Text style={styles.absenceNotes}>{item.notes}</Text>
                  ) : null}
                </View>
                
                {canDelete && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id, config.label)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 40,
    gap: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 10,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  formGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: '#1f2937',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  textArea: {
    height: 60,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  quickBtn: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickBtnText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '600',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  dropdownSelectorText: {
    fontSize: 14,
    color: '#1f2937',
  },
  dropdownList: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    maxHeight: 160,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 200,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  listSection: {
    gap: 10,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  absenceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  absenceCardContent: {
    flex: 1,
    gap: 4,
  },
  absenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  absenceUser: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    flex: 1,
  },
  absenceDates: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  absenceNotes: {
    fontSize: 12,
    color: '#4b5563',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  }
});
