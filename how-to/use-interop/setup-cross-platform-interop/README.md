# How To Use Interop API| Cross Platform Interop

## How It Works

The `client/src/provider.ts` file sets up all the related logic needed to be able to connect to another Interop Broker running on an another Platform.

## Get Started

Follow the instructions below to get up and running.

### Set up the project

1. Install dependencies. Note that these examples assume you are in the sub-directory for the example.

```bash
$ npm install
```

2. Build the project.

```bash
$ npm run build
```

3. Start the test server in a new window.

```bash
$ npm run start
```

4. Start both Platform applications.

```bash
$ npm run platform1
$ npm run platform2
```

### What you will see

Two different Platform windows. Each with 2 views that are set up to send and receive context. As a quick example, join a View to a context group by clicking on one of the color buttons up top and then set context on that View. Go to the other Platform window and join the same context group and that View should receive the context set in the previous step.