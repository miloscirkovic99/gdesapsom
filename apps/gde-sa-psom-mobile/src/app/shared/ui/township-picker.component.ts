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
import { filterTownshipsMulti } from '@gde/shared/util';

/**
 * Searchable township list, opened with ModalController. Dismisses with the
 * chosen ids (role 'confirm'), or with no data when cancelled.
 *
 * `create({ component: TownshipPickerComponent, componentProps: { townships, selected, multiple, title } })`
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
      <ion-toolbar>
        <ion-searchbar
          [placeholder]="'search' | transloco"
          [debounce]="150"
          (ionInput)="query.set($any($event).detail.value ?? '')"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (multiple) {
        <ion-list>
          @for (t of visible(); track t.id) {
            <ion-item>
              <ion-checkbox
                justify="space-between"
                [checked]="chosen().has(t.id)"
                (ionChange)="toggle(t.id, $event.detail.checked)"
              >
                {{ t.ime }}
              </ion-checkbox>
            </ion-item>
          }
        </ion-list>
      } @else {
        <ion-list>
          <ion-radio-group [value]="first()" (ionChange)="pick($event.detail.value)">
            @for (t of visible(); track t.id) {
              <ion-item>
                <ion-radio [value]="t.id" justify="space-between">{{ t.ime }}</ion-radio>
              </ion-item>
            }
          </ion-radio-group>
        </ion-list>
      }
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TownshipPickerComponent implements OnInit {
  private readonly modal = inject(ModalController);

  // componentProps are set as plain properties by ModalController.
  @Input() townships: Township[] = [];
  @Input() selected: number[] = [];
  @Input() multiple = true;
  @Input() title = 'township';

  readonly query = signal('');
  readonly chosen = signal(new Set<number>());
  readonly first = computed(() => [...this.chosen()][0] ?? null);
  readonly visible = computed(() =>
    filterTownshipsMulti({ townships: () => this.townships, townshipsByCity: () => [] }, this.query()),
  );

  ngOnInit(): void {
    this.chosen.set(new Set(this.selected));
  }

  toggle(id: number, checked: boolean): void {
    const next = new Set(this.chosen());
    if (checked) next.add(id);
    else next.delete(id);
    this.chosen.set(next);
  }

  pick(id: unknown): void {
    if (typeof id === 'number') {
      this.chosen.set(new Set([id]));
      this.confirm();
    }
  }

  cancel(): void {
    void this.modal.dismiss(null, 'cancel');
  }

  confirm(): void {
    void this.modal.dismiss([...this.chosen()], 'confirm');
  }
}
