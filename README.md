# CDK Parallel for Typescript/Javascript

[![NPM version](https://img.shields.io/npm/v/@stratusgrid/cdk-parallel?style=flat-square)](https://www.npmjs.com/package/@stratusgrid/cdk-parallel)
[![Youtube channel views](https://img.shields.io/youtube/channel/views/UCQtFai6GXG5YSXpl1geP5LQ?style=social)](https://www.youtube.com/channel/UCQtFai6GXG5YSXpl1geP5LQ)

A Javascript based library that enables AWS CDK to deploy stacks in parallel.

## Table of Contents
* [Getting Started](#getting-started)
* [Usage](#usage)
* [Credits](#credits)

## Getting Started

### In Node.js

The preferred way to install the StratusGrid CDK Parallelization library for Node.js is to use the [npm](http://npmjs.org) package manager for Node.js. Simply type the following into a terminal window:

```sh
npm install @stratusgrid/cdk-parallel
```

## Usage

### In Typescript

It is suggested you create a typescript file in the root of your CDK app. Then you can run the file with this code:

```typescript
import {DeploymentExecutor, DeploymentType} from '@stratusgrid/cdk-parallel';

(async function () {
    const executor = new DeploymentExecutor(DeploymentType.DEPLOY, __dirname, {
        PATH: process.env.PATH
    });
    await executor.run();
}());
```

## Credits

* [Biomapas/B.AwsCdkParallel](https://github.com/biomapas/B.AwsCdkParallel)