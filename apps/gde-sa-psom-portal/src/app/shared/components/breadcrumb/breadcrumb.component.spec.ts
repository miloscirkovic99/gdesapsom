import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { BreadcrumbComponent, BreadcrumbItem } from './breadcrumb.component';

@Component({
  imports: [BreadcrumbComponent],
  template: `<app-breadcrumb [items]="items()" />`,
})
class HostComponent {
  readonly items = signal<BreadcrumbItem[]>([
    { labelKey: 'breadcrumb_spots', link: ['/', 'all-spots'] },
    { label: 'Witch Bar' },
  ]);
}

describe('BreadcrumbComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const jsonLd = () => {
    const script = document.head.querySelector('script[type="application/ld+json"][data-seo-id="breadcrumb"]');
    return script ? JSON.parse(script.textContent ?? '') : null;
  };

  /** `nativeElement` is typed `any`, which rejects generic `querySelector` calls. */
  const element = () => fixture.nativeElement as HTMLElement;

  /** Two passes: the first renders, the second picks up the translated trail. */
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    document.head
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((script) => script.remove());

    await TestBed.configureTestingModule({
      imports: [
        HostComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            rs: {
              home: 'Početna',
              breadcrumb: 'Navigacija',
              breadcrumb_spots: 'Pet-friendly objekti',
              dog_food_title: 'Hrana za pse',
            },
          },
          translocoConfig: { availableLangs: ['rs'], defaultLang: 'rs' },
          preloadLangs: true,
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await settle();
  });

  it('renders Početna, the linked section and the current page', () => {
    const links = element().querySelectorAll<HTMLAnchorElement>('a');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[0].textContent?.trim()).toBe('Početna');
    expect(links[1].getAttribute('href')).toBe('/all-spots');
    expect(links[1].textContent?.trim()).toBe('Pet-friendly objekti');

    const current = element().querySelector('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('Witch Bar');
    expect(element().querySelector('nav')?.getAttribute('aria-label')).toBe('Navigacija');
  });

  it('publishes a BreadcrumbList that matches the trail, with no URL on the current page', () => {
    expect(jsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Početna', item: 'https://www.gdesapsom.com/' },
        { '@type': 'ListItem', position: 2, name: 'Pet-friendly objekti', item: 'https://www.gdesapsom.com/all-spots' },
        { '@type': 'ListItem', position: 3, name: 'Witch Bar' },
      ],
    });
  });

  it('keeps query strings on filtered list crumbs', async () => {
    fixture.componentInstance.items.set([
      { labelKey: 'dog_food_title', link: ['/', 'dog-food'] },
      { label: 'Suva hrana', link: ['/', 'dog-food'], queryParams: { type: 'dry' } },
      { label: 'Royal Canin Mini Adult' },
    ]);
    await settle();

    const items = jsonLd().itemListElement;
    expect(items).toHaveLength(4);
    expect(items[2]).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: 'Suva hrana',
      item: 'https://www.gdesapsom.com/dog-food?type=dry',
    });
    expect(element().querySelectorAll('a')[2].getAttribute('href')).toBe('/dog-food?type=dry');
  });

  it('removes the block when the page is left', () => {
    expect(jsonLd()).not.toBeNull();

    fixture.destroy();

    expect(jsonLd()).toBeNull();
  });
});
