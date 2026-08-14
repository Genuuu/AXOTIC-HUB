const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const newHandlers = `
  const handleAddFundTransaction = async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    const amount = parseFloat(newFundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!newFundNotes.trim()) {
      alert("Please enter a description for the transaction.");
      return;
    }

    const newTx: GeneralFundTransaction = {
      id: "tx-" + Date.now(),
      amount,
      type: newFundType,
      notes: newFundNotes.trim(),
      date: new Date().toISOString(),
      recordedBy: currentUser.uid
    };

    const nextTx = [newTx, ...generalFundTransactions];

    if (currentUser.isOfflineMock) {
      // Offline mode handling (mock)
      setGeneralFundTransactions(nextTx);
      setNewFundAmount("");
      setNewFundNotes("");
      setSuccessMsg("Transaction added to General Fund.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "settings", "general"), {
        generalFundTransactions: nextTx
      });
      setGeneralFundTransactions(nextTx);
      setNewFundAmount("");
      setNewFundNotes("");
      setSuccessMsg("Transaction saved to General Fund.");
    } catch (err) {
      // In case the document doesn't exist yet, try setDoc
      try {
        await setDoc(doc(db, "settings", "general"), { generalFundTransactions: nextTx }, { merge: true });
        setGeneralFundTransactions(nextTx);
        setNewFundAmount("");
        setNewFundNotes("");
        setSuccessMsg("Transaction saved to General Fund.");
      } catch (innerErr) {
        handleFirestoreError(innerErr, OperationType.WRITE, "settings/general");
        setErrorMsg("Failed to add transaction.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFundTransaction = async (txId: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    if (!window.confirm("Are you sure you want to delete this transaction from the General Fund ledger?")) return;

    const nextTx = generalFundTransactions.filter(t => t.id !== txId);
    
    if (currentUser.isOfflineMock) {
      setGeneralFundTransactions(nextTx);
      return;
    }

    try {
      await updateDoc(doc(db, "settings", "general"), {
        generalFundTransactions: nextTx
      });
      setGeneralFundTransactions(nextTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/general");
      setErrorMsg("Failed to delete transaction.");
    }
  };
`;

code = code.replace(
  '  // Administrative Audit Log State Fields',
  newHandlers + '\n  // Administrative Audit Log State Fields'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
