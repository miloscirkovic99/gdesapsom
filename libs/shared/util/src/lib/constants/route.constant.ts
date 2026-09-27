export class RouteConstants {
    static readonly about = 'about-us';
    static readonly business = 'for-business';
    static readonly allSpots = 'all-spots';
    static readonly petParks = 'pet-parks';
    static readonly admin='admin';
    static readonly settingSpots='setting-spots';
    static readonly pendingSpots='pending-spots';
    static readonly cookiesPolicy='cookies-policy';
    /** Also the privacy policy URL of the Android app on Google Play. */
    static readonly privacyPolicy = 'privacy-policy';
    static readonly townships='townships';
    static readonly vet_clinics='vet-clinics';
    static readonly addSpot = 'spots/new';
    static readonly addPark = 'parks/new';
    static readonly spotDetail = 'spots/:id';
    static readonly blog = 'blog';
    static readonly blogDetails = 'blog/:slug';
    static readonly dogFood = 'dog-food';
    static readonly dogFoodDetail = 'dog-food/:slug';
    static readonly petShops = 'pet-shops';
    static readonly petShopDetail = 'pet-shops/:slug';
    /** Admin children: /admin/pet-shops, /admin/dog-food, /admin/posts/new */
    static readonly adminPetShops = 'pet-shops';
    static readonly adminDogFood = 'dog-food';
    static readonly adminNewPost = 'posts/new';

}
