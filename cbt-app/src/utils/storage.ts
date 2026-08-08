import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { TrainingData } from '../types';

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// データの移行ロジック（初回ログイン時に実行）
export const migrateLocalDataToFirestore = async (uid: string) => {
  const isMigrated = localStorage.getItem('isMigratedToFirestore');
  if (isMigrated) return; // 移行済みの場合は何もしない

  const oldData = localStorage.getItem('cbt_history');
  if (oldData) {
    const trainings: TrainingData[] = JSON.parse(oldData);
    if (trainings.length > 0) {
      console.log('Migrating local data to Firestore...');
      for (const training of trainings) {
        const docRef = doc(db, 'users', uid, 'trainings', training.id);
        await setDoc(docRef, training);
      }
    }
  }
  // 移行完了フラグをセット
  localStorage.setItem('isMigratedToFirestore', 'true');
};

export const saveTraining = async (uid: string, data: TrainingData) => {
  const docRef = doc(db, 'users', uid, 'trainings', data.id);
  await setDoc(docRef, data);
};

export const getAllTrainings = async (uid: string): Promise<TrainingData[]> => {
  const colRef = collection(db, 'users', uid, 'trainings');
  const snapshot = await getDocs(colRef);
  const trainings: TrainingData[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as TrainingData;
    if (!data.isDeleted) {
      trainings.push(data);
    }
  });
  return trainings.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getTrashTrainings = async (uid: string): Promise<TrainingData[]> => {
  const colRef = collection(db, 'users', uid, 'trainings');
  const snapshot = await getDocs(colRef);
  const trainings: TrainingData[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as TrainingData;
    if (data.isDeleted) {
      trainings.push(data);
    }
  });
  return trainings.sort((a, b) => new Date(b.deletedAt || b.updatedAt).getTime() - new Date(a.deletedAt || a.updatedAt).getTime());
};

export const getTrainingCountByType = async (uid: string, type: 'autoThoughtCatch' | 'cognitiveRestructuring'): Promise<number> => {
  const trainings = await getAllTrainings(uid);
  return trainings.filter(t => t.type === type).length;
};

export const moveToTrash = async (uid: string, id: string) => {
  const docRef = doc(db, 'users', uid, 'trainings', id);
  await updateDoc(docRef, {
    isDeleted: true,
    deletedAt: new Date().toISOString()
  });
};

export const restoreFromTrash = async (uid: string, id: string) => {
  const docRef = doc(db, 'users', uid, 'trainings', id);
  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null
  });
};

export const permanentlyDelete = async (uid: string, id: string) => {
  const docRef = doc(db, 'users', uid, 'trainings', id);
  await deleteDoc(docRef);
};
