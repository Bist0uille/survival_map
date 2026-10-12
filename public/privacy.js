document.getElementById('clear-personal').addEventListener('click', () => {
  if (!window.confirm('Supprimer définitivement tes points personnels et itinéraires de cet appareil ?')) return
  const status = document.getElementById('clear-status')
  const request = indexedDB.open('survival-map')
  request.onerror = () => { status.textContent = 'Effacement impossible. Réessaie après avoir fermé les autres onglets.' }
  request.onsuccess = () => {
    const db = request.result
    const stores = ['personalPoints', 'personalRoutes'].filter((name) => db.objectStoreNames.contains(name))
    if (!stores.length) { db.close(); status.textContent = 'Aucune donnée personnelle enregistrée.'; return }
    const tx = db.transaction(stores, 'readwrite')
    for (const store of stores) tx.objectStore(store).clear()
    tx.oncomplete = () => { db.close(); status.textContent = 'Données personnelles effacées. Recharge les onglets de la carte encore ouverts.' }
    tx.onerror = () => { db.close(); status.textContent = 'Effacement impossible, réessaie.' }
  }
})
