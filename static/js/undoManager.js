export const undoManager = new UndoManager();

function UndoManager() {
    this.undoStack = [];
    this.redoStack = [];
}

UndoManager.prototype.addUndoAction = function(action) {
    this.undoStack.push(action);
    this.redoStack = [];
}

UndoManager.prototype.undo = function() {
    if (this.undoStack.length > 0) {
        const action = this.undoStack.pop();
        action.undo();
        this.redoStack.push(action);
    }
}

UndoManager.prototype.redo = function() {
    if (this.redoStack.length > 0) {
      const action = this.redoStack.pop();
      action.execute();
      this.undoStack.push(action);
    }
  }
