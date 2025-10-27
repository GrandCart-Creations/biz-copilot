// Quick fix script to set up initial user permissions
// Run this in your browser console after logging in

const setupUserPermissions = async () => {
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  const { getFirestore, doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('No user logged in');
    return;
  }
  
  // Create a default company for the user
  const companyId = `company_${user.uid}`;
  
  try {
    // Set up company
    await setDoc(doc(db, 'companies', companyId), {
      name: 'My Company',
      createdBy: user.uid,
      createdAt: new Date(),
    });
    
    // Set up user role in company
    await setDoc(doc(db, 'companies', companyId, 'users', user.uid), {
      email: user.email,
      role: 'owner',
      permissions: ['*'], // Full permissions
      createdAt: new Date(),
    });
    
    console.log('✅ User permissions set up successfully!');
    console.log('Company ID:', companyId);
    console.log('Please reload the page');
  } catch (error) {
    console.error('Error setting up permissions:', error);
  }
};

// Run the setup
setupUserPermissions();
