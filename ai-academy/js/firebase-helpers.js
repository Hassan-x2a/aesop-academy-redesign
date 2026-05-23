// Firebase Firestore Helpers for AESOP Assessment
// Handles read/write operations for learner assessment data with offline fallback

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { FIREBASE_CONFIG } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// Offline queue for write operations when Firestore is unavailable
const OFFLINE_QUEUE_KEY = 'aesop_firebase_offline_queue';
const OFFLINE_QUEUE_MAX = 100;
const LEARNER_ID_KEY = 'aesop-learner-id';  // matches students.html LS_ID

// Suppresses re-queuing inside helpers called during processOfflineQueue replay
let _replayActive = false;

/**
 * Initialize learner record in Firestore
 * Creates new record if doesn't exist
 * @param {string} learnerId - Learner UUID
 * @param {Object} initialData - Initial learner record data
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function initializeLearnerRecord(learnerId, initialData = {}) {
  try {
    if (!learnerId || learnerId.trim().length === 0) {
      throw new Error('Learner ID is required');
    }

    const learnerRef = doc(db, 'learners', learnerId);
    const existingDoc = await getDoc(learnerRef);

    if (existingDoc.exists()) {
      return {
        success: true,
        data: existingDoc.data(),
        message: 'Learner record already exists'
      };
    }

    // Create new record
    const now = new Date().toISOString();
    const newRecord = {
      learnerId,
      createdAt: now,
      lastActiveAt: now,
      assessmentResults: {
        completed: false,
        completedAt: null,
        conversationHistory: [],
        aptitudeScore: 0,
        interestTags: [],
        completionFlag: false
      },
      recommendedPathway: {
        generatedAt: null,
        primaryCourse: null,
        followUpCourses: [],
        reasoningBrief: ''
      },
      qrRecoveryToken: {
        token: '',
        generatedAt: null,
        qrCodeSvg: '',
        expiresAt: null
      },
      progressData: {
        coursesStarted: [],
        coursesCompleted: [],
        lastAccessedCourse: null,
        currentlyViewingCourse: null
      },
      ...initialData
    };

    await setDoc(learnerRef, newRecord);
    return {
      success: true,
      data: newRecord
    };

  } catch (error) {
    console.error('Failed to initialize learner record:', error);
    // Queue for offline sync
    queueOfflineWrite('initializeLearnerRecord', { learnerId, initialData });
    return {
      success: false,
      error: error.message,
      offline: true
    };
  }
}

/**
 * Read learner record from Firestore
 * @param {string} learnerId - Learner UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getLearnerRecord(learnerId) {
  try {
    if (!learnerId || learnerId.trim().length === 0) {
      throw new Error('Learner ID is required');
    }

    const learnerRef = doc(db, 'learners', learnerId);
    const docSnap = await getDoc(learnerRef);

    if (!docSnap.exists()) {
      return {
        success: false,
        error: 'Learner record not found',
        notFound: true
      };
    }

    return {
      success: true,
      data: docSnap.data()
    };

  } catch (error) {
    console.error('Failed to read learner record:', error);
    return {
      success: false,
      error: error.message,
      offline: true
    };
  }
}

/**
 * Update assessment results for learner
 * @param {string} learnerId - Learner UUID
 * @param {Object} assessmentData - Assessment results object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateAssessmentResults(learnerId, assessmentData) {
  try {
    if (!learnerId || !assessmentData) {
      throw new Error('Learner ID and assessment data are required');
    }

    const learnerRef = doc(db, 'learners', learnerId);

    // Add timestamp
    const updates = {
      assessmentResults: {
        ...assessmentData,
        completedAt: assessmentData.completedAt || new Date().toISOString()
      },
      lastActiveAt: new Date().toISOString()
    };

    await updateDoc(learnerRef, updates);
    return { success: true };

  } catch (error) {
    console.error('Failed to update assessment results:', error);
    // Queue for offline sync
    queueOfflineWrite('updateAssessmentResults', { learnerId, assessmentData });
    return {
      success: false,
      error: error.message,
      offline: true
    };
  }
}

/**
 * Store recommended pathway for learner
 * @param {string} learnerId - Learner UUID
 * @param {Object} pathwayData - Pathway object with primaryCourse, followUpCourses, reasoningBrief
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateRecommendedPathway(learnerId, pathwayData) {
  try {
    if (!learnerId || !pathwayData) {
      throw new Error('Learner ID and pathway data are required');
    }

    const learnerRef = doc(db, 'learners', learnerId);

    const updates = {
      recommendedPathway: {
        ...pathwayData,
        generatedAt: pathwayData.generatedAt || new Date().toISOString()
      },
      lastActiveAt: new Date().toISOString()
    };

    await updateDoc(learnerRef, updates);
    return { success: true };

  } catch (error) {
    console.error('Failed to update recommended pathway:', error);
    queueOfflineWrite('updateRecommendedPathway', { learnerId, pathwayData });
    return {
      success: false,
      error: error.message,
      offline: true
    };
  }
}

/**
 * Store QR recovery token for learner
 * @param {string} learnerId - Learner UUID
 * @param {Object} qrTokenData - QR token object with token, qrCodeSvg, expiresAt
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateQRRecoveryToken(learnerId, qrTokenData) {
  try {
    if (!learnerId || !qrTokenData) {
      throw new Error('Learner ID and QR token data are required');
    }

    const learnerRef = doc(db, 'learners', learnerId);

    const updates = {
      qrRecoveryToken: {
        ...qrTokenData,
        generatedAt: qrTokenData.generatedAt || new Date().toISOString()
      },
      lastActiveAt: new Date().toISOString()
    };

    await updateDoc(learnerRef, updates);
    return { success: true };

  } catch (error) {
    console.error('Failed to update QR recovery token:', error);
    queueOfflineWrite('updateQRRecoveryToken', { learnerId, qrTokenData });
    return {
      success: false,
      error: error.message,
      offline: true
    };
  }
}

/**
 * Add assessment conversation turn
 * @param {string} learnerId - Learner UUID
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addAssessmentMessage(learnerId, role, content) {
  try {
    if (!learnerId || !role || !content) {
      throw new Error('Learner ID, role, and content are required');
    }

    const learnerRef = doc(db, 'learners', learnerId);
    // seq is ms-since-epoch — allows deterministic ordering on read even if arrayUnion
    // delivers concurrent writes out of arrival order (offline replay + live session)
    const newMessage = { role, content, timestamp: new Date().toISOString(), seq: Date.now() };

    await updateDoc(learnerRef, {
      'assessmentResults.conversationHistory': arrayUnion(newMessage),
      lastActiveAt: new Date().toISOString()
    });

    return { success: true };

  } catch (error) {
    console.error('Failed to add assessment message:', error);
    queueOfflineWrite('addAssessmentMessage', { learnerId, role, content });
    return {
      success: false,
      error: error.message,
      offline: true
    };
  }
}

/**
 * Queue write operation for offline sync
 * @private
 */
function queueOfflineWrite(operation, data) {
  if (_replayActive) return;
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({ operation, data, timestamp: new Date().toISOString() });
    if (queue.length > OFFLINE_QUEUE_MAX) queue.splice(0, queue.length - OFFLINE_QUEUE_MAX);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to queue offline write:', error);
  }
}

/**
 * Process offline queue when connection restored
 * @returns {Promise<{success: boolean, processed: number, errors: Array}>}
 */
export async function processOfflineQueue() {
  try {
    const snapshot = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    const snapshotLen = snapshot.length;

    if (snapshotLen === 0) {
      return { success: true, processed: 0, errors: [] };
    }

    const errors = [];
    const failedItems = [];
    let processed = 0;

    _replayActive = true;
    try {
    for (const item of snapshot) {
      try {
        let result;
        switch (item.operation) {
          case 'initializeLearnerRecord':
            result = await initializeLearnerRecord(item.data.learnerId, item.data.initialData);
            break;
          case 'updateAssessmentResults':
            result = await updateAssessmentResults(item.data.learnerId, item.data.assessmentData);
            break;
          case 'updateRecommendedPathway':
            result = await updateRecommendedPathway(item.data.learnerId, item.data.pathwayData);
            break;
          case 'updateQRRecoveryToken':
            result = await updateQRRecoveryToken(item.data.learnerId, item.data.qrTokenData);
            break;
          case 'addAssessmentMessage':
            result = await addAssessmentMessage(item.data.learnerId, item.data.role, item.data.content);
            break;
          default:
            result = { success: false, error: `Unknown operation: ${item.operation}` };
        }
        if (result && !result.success) {
          failedItems.push(item);
          errors.push({ operation: item.operation, error: result.error || 'Write failed' });
        } else {
          processed++;
        }
      } catch (error) {
        failedItems.push(item);
        errors.push({ operation: item.operation, error: error.message });
      }
    }
    } finally {
      _replayActive = false;
    }

    // Merge failed retries with any items queued during replay, then persist
    const currentQueue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([...failedItems, ...currentQueue.slice(snapshotLen)]));

    return { success: true, processed, errors };

  } catch (error) {
    console.error('Failed to process offline queue:', error);
    return {
      success: false,
      processed: 0,
      errors: [{ operation: 'queue_processing', error: error.message }]
    };
  }
}

/**
 * Setup online/offline listeners
 */
export function setupOfflineSync() {
  window.addEventListener('online', async () => {
    console.log('Connection restored. Processing offline queue...');
    const result = await processOfflineQueue();
    if (result.errors.length > 0) {
      console.warn('Some offline operations failed:', result.errors);
    }
  });
}

/**
 * Get or create learner ID (stored in localStorage)
 * @returns {string} Learner UUID
 */
export function getOrCreateLearnerId() {
  let learnerId = localStorage.getItem(LEARNER_ID_KEY);

  if (!learnerId) {
    // Generate UUID v4
    learnerId = generateUUID();
    localStorage.setItem(LEARNER_ID_KEY, learnerId);
  }

  return learnerId;
}

/**
 * Generate UUID v4
 * @private
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default {
  initializeLearnerRecord,
  getLearnerRecord,
  updateAssessmentResults,
  updateRecommendedPathway,
  updateQRRecoveryToken,
  addAssessmentMessage,
  processOfflineQueue,
  setupOfflineSync,
  getOrCreateLearnerId
};
