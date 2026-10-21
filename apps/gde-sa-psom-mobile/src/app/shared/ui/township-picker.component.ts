import { ChangeDetectionStrategy, Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonCheckbox } from '@ionic/angular/ion-checkbox';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonItem } from '@ionic/angular/ion-item';
import { IonList } from '@ionic/angular/ion-list';
import { IonRadio } from '@ionic/angular/ion-radio';
import { IonRadioGroup } from '@ionic/angular/ion-radio-group';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import { TranslocoPipe } from '@ngneat/transloco';
import { Township } from '@gde/shared/data-access';
import { groupTownships, spansSeveralCities, TownshipGroup } from './township-groups';

type CityState = 'none' | 'some' | 'all';

/**
 * Searchable township list, opened with ModalController. Dismisses with the
 * chosen ids (role 'confirm'), or with no data when cancelled.
 *
 * `create({ component: TownshipPickerComponent, componentProps: { townships, selected, multiple, title } })`
 *
 * Townships of several cities are listed by city; with `multiple`, each city
 * with several townships gets a "whole city" row that selects all of them.
 */
@Component({
  selector: 'app-township-picker',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    TranslocoPipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">{{ 'mobile_cancel' | transloco }}</ion-button>
        </ion-buttons>
        <ion-title>{{ title | transloco }}</ion-title>
        <ion-buttons slot="end">
          <ion-button strong (click)="confirm()">{{ 'mobile_done' | transloco }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar class="sub-toolbar">
        <div class="search-row">
          <ion-searchbar
            [placeholder]="'search' | transloco"
            [attr.aria-label]="'search' | transloco"
            [debounce]="150"
            (ionInput)="query.set($any($event).detail.value ?? '')"
          />
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (multiple) {
        @for (g of groups(); track g.key) {
          @if (grouped()) {
            <h2 class="group-label">{{ g.city ?? ('mobile_other_towns' | transloco) }}</h2>
          }
          <ion-list>
            @if (grouped() && g.city !== null) {
              <ion-item>
                <ion-checkbox
                  class="whole-city"
                  justify="space-between"
                  [checked]="cityState(g) === 'all'"
                  [indeterminate]="cityState(g) === 'some'"
                  (ionChange)="toggleCity(g, $event.detail.checked)"
                >
                  {{ 'mobile_whole_city' | transloco }}
                </ion-checkbox>
              </ion-item>
            }
            @for (t of g.rows; track t.id) {
              <ion-item>
                <ion-checkbox
                  justify="space-between"
                  [checked]="chosen().has(t.id)"
                  (ionChange)="toggle(t.id, $event.detail.checked)"
                >
                  {{ t.name }}
                </ion-checkbox>
              </ion-item>
            }
          </ion-list>
        }
      } @else {
        <ion-radio-group [value]="first()" (ionChange)="pick($event.detail.value)">
          @for (g of groups(); track g.key) {
            @if (grouped()) {
              <h2 class="group-label">{{ g.city ?? ('mobile_other_towns' | transloco) }}</h2>
            }
            <ion-list>
              @for (t of g.rows; track t.id) {
                <ion-item>
                  <ion-radio [value]="t.id" justify="space-between">{{ t.name }}</ion-radio>
                </ion-item>
              }
            </ion-list>
          }
        </ion-radio-group>
      }
      @if (!groups().length) {
        <p class="empty">{{ 'no_results_title' | transloco }}</p>
      }
    </ion-content>
  `,
  styles: `
    ion-list {
      padding-top: 4px;
    }
    ion-item {
      --min-height: 52px;
    }
    ion-buttons ion-button[strong] {
      --color: var(--app-primary-text);
      font-weight: 700;
    }
    .group-label:first-child {
      margin-top: 16px;
    }
    .whole-city {
      font-weight: 600;
    }
    .empty {
      margin: 32px var(--app-gutter);
      color: var(--app-text-2);
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TownshipPickerComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);

  // componentProps are set as plain properties by ModalController.
  @Input() townships: Township[] = [];
  @Input() selected: number[] = [];
  @Input() multiple = true;
  @Input() title = 'township';

  readonly query = signal('');
  readonly chosen = signal(new Set<number>());
  readonly first = computed(() => [...this.chosen()][0] ?? null);
  /** Headers and "whole city" rows only when the list holds more than one city. */
  readonly grouped = signal(false);
  readonly groups = computed(() => this.#group(this.query()));

  ngOnInit(): void {
    this.chosen.set(new Set(this.selected));
    this.grouped.set(spansSeveralCities(this.townships));
  }

  cityState(group: TownshipGroup): CityState {
    const chosen = this.chosen();
    const count = group.allIds.filter((id) => chosen.has(id)).length;
    if (!count) return 'none';
    return count === group.allIds.length ? 'all' : 'some';
  }

  toggle(id: number, checked: boolean): void {
    const next = new Set(this.chosen());
    if (checked) next.add(id);
    else next.delete(id);
    this.chosen.set(next);
  }

  /** Every township of the city, including those the search hides. */
  toggleCity(group: TownshipGroup, checked: boolean): void {
    const next = new Set(this.chosen());
    for (const id of group.allIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    this.chosen.set(next);
  }

  pick(id: unknown): void {
    if (typeof id === 'number') {
      this.chosen.set(new Set([id]));
      this.confirm();
    }
  }

  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm(): void {
    void this.modalCtrl.dismiss([...this.chosen()], 'confirm');
  }

  #group(query: string): TownshipGroup[] {
    const groups = groupTownships(this.townships, query);
    if (this.grouped()) return groups;
    // One city (the vets page passes the chosen city's townships): a plain list.
    const rows = groups.flatMap((g) => g.rows).sort((a, b) => a.name.localeCompare(b.name, 'sr'));
    return rows.length ? [{ key: 'all', city: null, allIds: rows.map((r) => r.id), rows }] : [];
  }
}
