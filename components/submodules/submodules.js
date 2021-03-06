
var ko = require('knockout');
var components = require('ungit-components');
var programEvents = require('ungit-program-events');

components.register('submodules', function(args) {
  return new SubmodulesViewModel(args.server, args.repoPath);
});

function SubmodulesViewModel(server, repoPath) {
  var self = this;
  this.repoPath = repoPath;
  this.server = server;
  this.submodules = ko.observableArray();

  this.updateProgressBar = components.create('progressBar', { predictionMemoryKey: 'Updating Submodules', temporary: true });
  this.addProgressBar = components.create('progressBar', { predictionMemoryKey: 'Adding Submodule', temporary: true });
}

SubmodulesViewModel.prototype.onProgramEvent = function(event) {
  if (event.event == 'submodule-added') this.fetchSubmodules();
}

SubmodulesViewModel.prototype.updateNode = function(parentElement) {
  this.fetchSubmodules(function(submoduleViewModel) {
    ko.renderTemplate('submodules', submoduleViewModel, {}, parentElement);
  });
}

SubmodulesViewModel.prototype.fetchSubmodules = function(callback) {
  var self = this;

  this.server.get('/submodules', { path: this.repoPath }, function(err, submodules) {
    // if returned is not array, don't render submodules module
    if (submodules && Array.isArray(submodules)) {
      self.submodules(submodules);
    }

    if (callback) {
      callback(self);
    }
  });
}

SubmodulesViewModel.prototype.isRunning = function() {
  return (this.updateProgressBar.running() || this.addProgressBar.running());
}

SubmodulesViewModel.prototype.updateSubmodules = function() {
  if (this.isRunning()) return;
  var self = this;

  this.updateProgressBar.start();
  this.server.post('/submodules/update', { path: this.repoPath }, function(err, result) {
    self.updateProgressBar.stop();
  });
}

SubmodulesViewModel.prototype.showAddSubmoduleDialog = function() {
  var self = this;
  var diag = components.create('addsubmoduledialog');
  diag.closed.add(function() {
    if (diag.isSubmitted()) {
      self.addProgressBar.start();
      self.server.post('/submodules/add', { path: self.repoPath, submoduleUrl: diag.url(), submodulePath: diag.path() }, function(err, result) {
        if (err) {
          console.log(err);
          return;
        }

        programEvents.dispatch({ event: 'submodule-added' });
        self.addProgressBar.stop();
      });
    }
  });
  programEvents.dispatch({ event: 'request-show-dialog', dialog: diag });
}

SubmodulesViewModel.prototype.submoduleLinkClick = function(submodule) {
  window.location.href = submodule.url;
}

SubmodulesViewModel.prototype.submodulePathClick = function(submodule) {
  window.location.href = document.URL + '/' + submodule.path;
}
