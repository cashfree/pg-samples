import { Component } from '@angular/core';

@Component({
  selector: 'app-success',
  standalone: true, // ✅ Required for standalone components used in routing
  imports: [],
  templateUrl: './success.component.html',
  styleUrl: './success.component.scss',
})
export class SuccessComponent {}
