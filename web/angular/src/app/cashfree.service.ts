// src/app/cashfree.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CashfreeService {
  private sdkLoaded = false;

  loadSDK(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.sdkLoaded) {
        return resolve((window as any).Cashfree);
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => {
        this.sdkLoaded = true;
        resolve((window as any).Cashfree);
      };
      script.onerror = reject;

      document.body.appendChild(script);
    });
  }

  async getInstance(): Promise<any> {
    const Cashfree = await this.loadSDK();
    return Cashfree({ mode: 'production' });
  }
}
