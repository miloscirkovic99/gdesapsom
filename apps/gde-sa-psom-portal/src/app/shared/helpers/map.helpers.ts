 export const descriptionToKeyMap: { [key: string]: string } = {
    'Svi psi': 'all_dogs',
    'Mali pas': 'small_dog',
    'Mali pas i štenci većih rasa do 5 meseci starosti': 'small_puppies',
  };
  export const descriptionToKeyMapSpot: { [key: string]: string } = {
    'Kafić': 'cafe',
    'Restoran': 'restaurant',
    'Splav': 'float',
    'Hotel': 'hotel',
    'Pab': 'pub',
    'Motel': 'motel',
    'Teretana': 'gym',
    'Apartman': 'apartment',
    'Ostalo': 'other',
    'Kafeterija':'cafeteria',
    'Bar':'bar'
  };
  /** schema.org type for the spot page's JSON-LD; types missing here fall back to LocalBusiness. */
  export const spotTypeToSchemaType: { [key: string]: string } = {
    'Kafić': 'CafeOrCoffeeShop',
    'Kafeterija': 'CafeOrCoffeeShop',
    'Restoran': 'Restaurant',
    'Splav': 'FoodEstablishment',
    'Pab': 'BarOrPub',
    'Bar': 'BarOrPub',
    'Hotel': 'Hotel',
    'Motel': 'Motel',
    'Apartman': 'LodgingBusiness',
    'Teretana': 'ExerciseGym',
    'Ostalo': 'LocalBusiness',
  };
  export const descriptionToKeyMapGarden: { [key: string]: string } = {
    'sa baštom': 'with_garden',
    'bez bašte': 'without_garden',
  };