var ENVIRONMENT_IS_WEB = typeof window === 'object';

var ModuleCR = ModuleCR || ModuleCR(Module) || {};

if (ENVIRONMENT_IS_WEB) {
  ModuleCR['noInitialRun'] = true;
  ModuleCR['noExitRuntime'] = true;
}
