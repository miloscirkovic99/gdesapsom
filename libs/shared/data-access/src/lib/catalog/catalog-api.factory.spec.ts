import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../config/app-config';
import { DogFoodApi, DogFoodHttpApi, DogFoodMockApi } from './dog-food.api';
import { PetShopsApi, PetShopsHttpApi, PetShopsMockApi } from './pet-shops.api';

function configure(useCatalogMocks: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: APP_CONFIG, useValue: { apiUrl: 'https://api.test/', production: false, useCatalogMocks } },
    ],
  });
}

describe('catalog API factories', () => {
  it('serve the in-memory mocks when useCatalogMocks is on', () => {
    configure(true);
    expect(TestBed.inject(DogFoodApi)).toBeInstanceOf(DogFoodMockApi);
    expect(TestBed.inject(PetShopsApi)).toBeInstanceOf(PetShopsMockApi);
  });

  it('talk to the API otherwise', () => {
    configure(false);
    expect(TestBed.inject(DogFoodApi)).toBeInstanceOf(DogFoodHttpApi);
    expect(TestBed.inject(PetShopsApi)).toBeInstanceOf(PetShopsHttpApi);
  });
});
