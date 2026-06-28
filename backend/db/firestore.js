const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let app;
// Initialize Firebase Admin
try {
  const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));
  app = initializeApp({
    credential: cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Error:', error);
  process.exit(1);
}

const db = getFirestore(app);

const firestoreDb = {
  admin: {
    auth: () => getAuth(app)
  },
  db,
  
  // Create / Insert
  insert: async (collection, data) => {
    const id = data.id || uuidv4();
    const docData = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };
    await db.collection(collection).doc(id).set(docData);
    return docData;
  },

  // Read Multiple
  find: async (collection, query = {}) => {
    // Optimization: If querying by ID, use direct document lookup
    if (query.id) {
      const doc = await firestoreDb.findOne(collection, query);
      return doc ? [doc] : [];
    }

    let collRef = db.collection(collection);
    
    // We can only do exact equality matches easily with this wrapper format.
    // For more complex queries, routes will use db directly.
    for (const [key, value] of Object.entries(query)) {
      collRef = collRef.where(key, '==', value);
    }
    
    const snapshot = await collRef.get();
    const results = [];
    snapshot.forEach(doc => results.push(doc.data()));
    return results;
  },

  // Read Single
  findOne: async (collection, query = {}) => {
    // Optimization: Direct lookup if ID is provided
    if (query.id) {
      const docRef = db.collection(collection).doc(query.id);
      const doc = await docRef.get();
      if (!doc.exists) return null;
      
      const data = doc.data();
      // Ensure other query conditions (e.g., userId) match
      for (const [key, value] of Object.entries(query)) {
        if (data[key] !== value) return null;
      }
      return data;
    }

    // Optimization: Use limit(1) to prevent full collection scans
    let collRef = db.collection(collection);
    for (const [key, value] of Object.entries(query)) {
      collRef = collRef.where(key, '==', value);
    }
    
    const snapshot = await collRef.limit(1).get();
    if (snapshot.empty) return null;
    
    return snapshot.docs[0].data();
  },

  // Update
  update: async (collection, query, updateData) => {
    // Usually query is { id: someId }
    if (query.id) {
      await db.collection(collection).doc(query.id).update(updateData);
      const updated = await db.collection(collection).doc(query.id).get();
      return updated.data();
    } else {
      // Update first matching doc
      const docs = await firestoreDb.find(collection, query);
      if (docs.length > 0) {
        const docId = docs[0].id;
        await db.collection(collection).doc(docId).update(updateData);
        const updated = await db.collection(collection).doc(docId).get();
        return updated.data();
      }
      return null;
    }
  },

  // Delete
  remove: async (collection, query) => {
    if (query.id) {
      await db.collection(collection).doc(query.id).delete();
      return true;
    } else {
      const docs = await firestoreDb.find(collection, query);
      for (const doc of docs) {
        await db.collection(collection).doc(doc.id).delete();
      }
      return true;
    }
  }
};

module.exports = firestoreDb;
