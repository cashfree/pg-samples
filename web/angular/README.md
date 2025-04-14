# Cashfree Checkout Integration with an Angular App


Three steps are required

- Creating order (Basically the amount you want to collect from user, you can also pass cart info. ref docs for additional info)  
  - You will need backend server to do that, you cannot hit cretae order  directly  from frontend  
  - We have express server here
  - Create .env file inside /backend folder and add your [CF_CLIENT_ID] appId and [CF_CLIENT_ID] secretKey
- Launch checkout
- ✨ Checking the status of order when done



```sh
ng serve --host 0.0.0.0 --disable-host-check 
```

```sh
ngrok http 4200         
```
```sh
cd backend && node index.js     
```

Ngrok is required because you cannot launch checkout from localhost
