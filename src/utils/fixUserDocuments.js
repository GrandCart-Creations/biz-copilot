/**
 * MIGRATION SCRIPT: Fix Missing User Documents
 * 
 * Run this in browser console to backfill missing user documents
 * for companies where the creator exists but user document doesn't
 * 
 * Usage: Copy this file content and paste in browser console while logged in
 */

export const fixUserDocumentsScript = `
// Fix Missing User Documents Migration Script
// Run this in your browser console while logged in

(async function fixUserDocuments() {
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  const { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ No user logged in. Please log in first.');
    return;
  }
  
  console.log('🔧 Starting user document migration for:', user.email);
  console.log('User ID:', user.uid);
  
  try {
    // Get all companies created by this user
    const companiesQuery = query(
      collection(db, 'companies'),
      where('createdBy', '==', user.uid)
    );
    
    const companiesSnapshot = await getDocs(companiesQuery);
    console.log(\`📊 Found \${companiesSnapshot.docs.length} companies created by user\`);
    
    let fixed = 0;
    let alreadyExists = 0;
    let errors = 0;
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      const companyData = companyDoc.data();
      const companyName = companyData.name || 'Unnamed Company';
      
      console.log(\`\\n📁 Checking company: \${companyName} (\${companyId})\`);
      
      // Check if user document exists
      const userRef = doc(db, 'companies', companyId, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        console.log('  ✅ User document already exists');
        alreadyExists++;
      } else {
        console.log('  ⚠️  User document missing - creating...');
        try {
          await setDoc(userRef, {
            role: 'owner',
            accessModules: ['expenses', 'income', 'marketing', 'forecasting', 'settings'],
            subscriptionTier: 'business',
            joinedAt: serverTimestamp(),
            email: user.email
          });
          console.log('  ✅ User document created successfully');
          fixed++;
        } catch (error) {
          console.error('  ❌ Error creating user document:', error);
          errors++;
        }
      }
    }
    
    console.log('\\n\\n📊 Migration Summary:');
    console.log(\`✅ Fixed: \${fixed} companies\`);
    console.log(\`✓ Already existed: \${alreadyExists} companies\`);
    console.log(\`❌ Errors: \${errors} companies\`);
    console.log(\`\\n🎉 Migration complete! Please refresh the page.\`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
})();
`;

/**
 * Utility function to run the migration from within the app
 * (For admin use)
 */
export const runUserDocumentMigration = async (currentUser, db) => {
  if (!currentUser || !db) {
    throw new Error('User and database required');
  }

  const { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');

  console.log('[Migration] Starting user document migration for:', currentUser.email);

  try {
    // Get all companies created by this user
    const companiesQuery = query(
      collection(db, 'companies'),
      where('createdBy', '==', currentUser.uid)
    );
    
    const companiesSnapshot = await getDocs(companiesQuery);
    console.log(`[Migration] Found ${companiesSnapshot.docs.length} companies`);

    let fixed = 0;
    let alreadyExists = 0;
    let errors = 0;
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      const companyData = companyDoc.data();
      const companyName = companyData.name || 'Unnamed Company';
      
      // Check if user document exists
      const userRef = doc(db, 'companies', companyId, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        alreadyExists++;
      } else {
        try {
          await setDoc(userRef, {
            role: 'owner',
            accessModules: ['expenses', 'income', 'marketing', 'forecasting', 'settings'],
            subscriptionTier: 'business',
            joinedAt: serverTimestamp(),
            email: currentUser.email
          });
          fixed++;
          console.log(`[Migration] ✅ Fixed: ${companyName}`);
        } catch (error) {
          console.error(`[Migration] ❌ Error for ${companyName}:`, error);
          errors++;
        }
      }
    }
    
    return {
      success: true,
      fixed,
      alreadyExists,
      errors,
      total: companiesSnapshot.docs.length
    };
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

