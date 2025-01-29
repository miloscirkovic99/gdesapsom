import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, take, takeUntil } from 'rxjs';
import { CardComponent } from "../../../../shared/components/card/card.component";

@Component({
  selector: 'app-pending-spots',
  imports: [CommonModule, CardComponent],
  templateUrl: './pending-spots.component.html',
  styleUrl: './pending-spots.component.scss',
})
export class PendingSpotsComponent {
  private destroyed$ = new Subject<void>();
  pendingSpots = signal<any>([]);
  private http = inject(HttpClient);
  ngOnInit(): void {
   
    this.getPendingSpots()
  }
  getPendingSpots() {
    this.http
      .get<any>('pet-friendly-spots/pending')
      .pipe(take(1), takeUntil(this.destroyed$))
      .subscribe({
        next: (result) => {
          this.pendingSpots.set(result.pending);
        },
      });
  }
  onAction(data:any){
    console.log(data);
    
  }
  ngOnDestroy(): void {

    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
