# toro
A GraphQl based, real-time monitoring backend for BullMq. 

## Features
- Organize queues into "hosts" which correspond to a redis instance. This allows
  us to model "environments" like development, staging and production.
- Job schema validation, implemented using JSON Schema. Job data and options are validated on creation. 
- Collect and store metrics on job, queue and redis instances.
- Monitor metrics and generate alerts and notifications based on threshold, change or anomaly detection.
- Advanced job search (find jobs based on data or options)
- Support for multiple node servers (coming soon)

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
yarn run serve
```

### Compiles and minifies for production
```
yarn run build
```

### Run your tests
```
yarn run test
```

### Lints and fixes files
```
yarn run lint
```

### Run your unit tests
```
yarn run test:unit
```
