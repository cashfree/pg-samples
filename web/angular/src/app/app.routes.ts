// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { ProductComponent } from './product/product.component';
import { SuccessComponent } from './success/success.component';

export const routes: Routes = [
  { path: '', component: ProductComponent }, // 👈 home route for product page
  { path: 'success', component: SuccessComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }, // optional fallback route
];
