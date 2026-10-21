// store.js
export const store = {
  coins: 0,
  load(){ try{ const d=JSON.parse(localStorage.getItem('archer3d')||'{}'); this.coins=d.coins||0; }catch(e){} },
  save(){ try{ localStorage.setItem('archer3d', JSON.stringify({coins:this.coins})); }catch(e){} }
};
store.load();
