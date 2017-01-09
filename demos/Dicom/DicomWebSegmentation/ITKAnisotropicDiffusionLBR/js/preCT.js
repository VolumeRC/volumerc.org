var ENVIRONMENT_IS_WEB = typeof window === 'object';

var ModuleCT = ModuleCT || ModuleCT(Module) || {};

if (ENVIRONMENT_IS_WEB) {
  ModuleCT['noInitialRun'] = true;
  ModuleCT['noExitRuntime'] = true;
}
