jest.setTimeout(30000);

process.on('unhandledRejection', r => console.log(r));
process.traceDeprecation = true;
