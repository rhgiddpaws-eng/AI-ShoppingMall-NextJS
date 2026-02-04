### ssl 설정

```bash
apt-get update
apt-get install certbot python3-certbot-nginx
certbot certonly --webroot -w /usr/share/nginx/html -d ecommerce.yes.monster --email milli@molluhub.com --agree-tos --no-eff-email
```

```bash
root@d0d44d21e87a:/# certbot certonly --webroot -w /usr/share/nginx/html -d ecommerce.yes.monster --email milli@molluhub.com --agree-tos --no-eff-email
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Requesting a certificate for ecommerce.yes.monster

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/ecommerce.yes.monster/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/ecommerce.yes.monster/privkey.pem
This certificate expires on 2025-06-11.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
If you like Certbot, please consider supporting our work by:
 * Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
 * Donating to EFF:                    https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```
