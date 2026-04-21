import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

// Primary functions instance (europe-west1 for UniGIS production)
const functions = getFunctions(app, 'europe-west1');

export const updateUserClaimsFunction = httpsCallable(functions, 'updateUserClaims');
export const generateMinutaFunction = httpsCallable<any, { success: boolean, html: string }>(functions, 'generateMinuta');
