import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CashfreeService } from '../cashfree.service';
import { Router } from '@angular/router'; // 👈 for navigation

@Component({
  selector: 'app-product',
  standalone: true,
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
})
export class ProductComponent {
  isLoading = false;

  constructor(
    private http: HttpClient,
    private cashfree: CashfreeService,
    private router: Router // 👈 inject router
  ) {}

  async buyNow() {
    this.isLoading = true;

    const orderPayload = {
      order_amount: 1.0,
      order_currency: 'INR',
      order_id: 'devstudio_' + Date.now(),
      customer_details: {
        customer_id: 'devstudio_user',
        customer_phone: '8474090589',
      },
      order_meta: {
        return_url:
          'https://www.cashfree.com/devstudio/preview/pg/web/popupCheckout?order_id={order_id}',
      },
    };

    try {
      // Express server on 3000 which does s2s calls to cashfree

      const response: any = await this.http
        .post('http://localhost:3000/create-order', orderPayload)
        .toPromise();

      console.log('[Order Created]', response);

      const orderId = orderPayload.order_id;

      const cashfree = await this.cashfree.getInstance();
      const result = await cashfree.checkout({
        paymentSessionId: response.payment_session_id,
        redirectTarget: '_modal',
      });

      this.isLoading = false;

      if (result.error) {
        console.log('User closed modal or payment error', result.error);
        return;
      }

      // 🔁 Confirm payment after modal closes
      console.log('✅ Modal closed, checking payment status...');

      const status: any = await this.http
        .get(`http://localhost:3000/payment-status/${orderId}`)
        .toPromise();

      const payment = status[0];

      if (
        payment &&
        payment.payment_status &&
        payment.payment_status.toLowerCase() === 'success'
      ) {
        console.log('🎉 Payment successful');
        this.router.navigate(['/success']);
      } else {
        console.log('❌ Payment not successful');
        alert('Payment failed or cancelled.');
      }
    } catch (err) {
      this.isLoading = false;
      console.error('Error occurred:', err);
      alert('Something went wrong');
    }
  }
}
