const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('C:/Users/scott/Downloads/playagame-f733d-firebase-adminsdk-fbsvc-5f34b68387.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'playagame-f733d'
});

const db = admin.firestore();
const learnerId = 'AESOP-YAPT';
const earnedAt = new Date().toISOString();

const certRecord = {
  id: `T01-L01:${Date.now()}`,
  source: 'ai_exam',
  status: 'certified',
  evidence: 'verified',
  depthId: 'expert-challenge',
  depthLabel: 'Expert Challenge',
  certificationTierId: 'leadership',
  certificationTierLabel: 'Leadership',
  ladderTierId: 'T01',
  ladderTierLabel: 'AI Orientation',
  tierOrder: 1,
  title: 'AI Orientation - Leadership Expert Challenge',
  earnedAt: earnedAt,
  score: null,
  rationale: 'Independent validation confirmed learner evidence and examiner process.',
  standards: ['NIST AI RMF', 'EU AI Act', 'WEF'],
  blueprintId: 'T01-expert-challenge',
  blueprintVersion: '1.0',
  identityAssurance: { level: 'account_bound', confirmedAt: earnedAt },
  validation: { valid: true, examinerScore: 7, rationale: 'Passed all rubric dimensions' },
  validationStatus: 'valid',
  transcriptLine: 'AI Orientation - Leadership Expert Challenge. Independent validation confirmed learner evidence and examiner process.'
};

const attemptRecord = {
  attemptId: `attempt-${Date.now()}`,
  blueprintId: 'T01-expert-challenge',
  blueprintVersion: '1.0',
  ladderTierId: 'T01',
  certificationTierId: 'leadership',
  testDepthId: 'expert-challenge',
  status: 'certified',
  validationStatus: 'valid',
  completedAt: earnedAt,
  rationale: 'Expert challenge on AI Orientation at Leadership tier completed successfully'
};

(async () => {
  try {
    const learnerRef = db.collection('learners').doc(learnerId);
    const learnerDoc = await learnerRef.get();
    const currentData = learnerDoc.exists ? learnerDoc.data() : {};
    const currentProgress = currentData.ladderProgress || {};

    await learnerRef.set({
      ...currentData,
      learnerId: learnerId,
      lastActiveAt: new Date().toISOString(),
      ladderProgress: {
        ...currentProgress,
        ladderCertifications: [certRecord, ...(currentProgress.ladderCertifications || [])].slice(0, 300),
        evaluationAttempts: [attemptRecord, ...(currentProgress.evaluationAttempts || [])],
        certificationValidations: [
          { id: `validation-${Date.now()}`, attemptId: attemptRecord.attemptId, valid: true, examinerScore: 7 },
          ...(currentProgress.certificationValidations || [])
        ]
      }
    });

    console.log('✓ Firestore updated successfully');
    console.log('  Learner: AESOP-YAPT');
    console.log('  Certification: AI Orientation - Leadership Expert Challenge');
    console.log('  Status: Certified');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
})();
