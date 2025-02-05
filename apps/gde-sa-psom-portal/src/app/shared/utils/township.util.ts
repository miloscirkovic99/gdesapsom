// township-utils.ts

// Function to normalize accented characters
 function normalizeString(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  
  // Function to filter townships with normalized strings
  export function filterTownshipsMulti(sharedStore: any, searchValue: string) {
    if (!sharedStore.townships()) {
      return [];
    }
  
    if (!searchValue) {
      return sharedStore.townships().slice();
    }
  
    const normalizedSearch = normalizeString(searchValue);
  
    return sharedStore.townships().filter((township: any) =>
      normalizeString(township.ime).includes(normalizedSearch)
    );
  }
  