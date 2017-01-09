var ENVIRONMENT_IS_WEB = typeof window === 'object';

var ModuleCE = ModuleCE || ModuleCE(Module) ||{};

if (ENVIRONMENT_IS_WEB) {
    ModuleCE['noInitialRun'] = true;
    ModuleCE['noExitRuntime'] = true;
}
