import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  // Replace with your VAPID public key
  readonly VAPID_PUBLIC_KEY = 'YOUR_PUBLIC_VAPID_KEY';

  constructor(private swPush: SwPush) {}

  subscribeToNotifications() {
    if (!this.swPush.isEnabled) {
      console.warn('Push notifications are not enabled');
      return;
    }
    this.swPush.requestSubscription({
      serverPublicKey: this.VAPID_PUBLIC_KEY
    })
    .then(sub => {
      // Send subscription to the server
      console.log('Push subscription:', sub);
    })
    .catch(err => console.error('Could not subscribe to notifications', err));
  }

  listenForMessages() {
    this.swPush.messages.subscribe(message => {
      console.log('Received push message', message);
      // Handle the message (show notification, etc.)
    });
  }

  // There is no public API for subscription changes in SwPush as of now.
  // This method has been removed to avoid accessing private properties.
}
