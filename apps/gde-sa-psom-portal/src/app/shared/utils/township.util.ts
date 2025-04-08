// township-utils.ts

// Function to normalize accented characters
 function normalizeString(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  
  // Function to filter townships with normalized strings
  export function filterTownshipsMulti(sharedStore: any, searchValue: string,onlyTownships=false) {
      const filter=onlyTownships?sharedStore.townshipsByCity() : sharedStore.townships()
    if (!filter) {
      return [];
    }
  
    if (!searchValue) {
      return filter.slice();
    }
  
    const normalizedSearch = normalizeString(searchValue);
  
    return filter.filter((township: any) =>
      normalizeString(township.ime).includes(normalizedSearch)
    );
  }
  