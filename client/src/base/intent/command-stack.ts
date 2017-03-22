import "reflect-metadata"
import {injectable, inject} from "inversify"
import {TYPES} from "../types"
import {SModelRoot, SModel, SModelFactory} from "../model"
import {IViewer} from "../view"
import {Logger} from "../../utils"
import {Command, CommandExecutionContext} from "./commands"

export interface ICommandStack {
    execute(commands: Command[]): void
    undo(): void
    redo(): void
}

/**
 * The component that holds the model and applies the commands to change it.
 */
@injectable()
export class CommandStack implements ICommandStack {

    defaultDuration = 250

    @inject(SModelFactory) protected modelFactory: SModelFactory
    @inject(TYPES.IViewer) protected viewer: IViewer
    @inject(TYPES.Logger) protected logger: Logger

    protected currentPromise: Promise<SModelRoot> = Promise.resolve(SModel.EMPTY_ROOT)

    protected undoStack: Command[] = []
    protected redoStack: Command[] = []

    execute(commands: Command[]): void {
        commands.forEach(
            (command) => {
                this.currentPromise = this.currentPromise.then(
                    model => {
                        return new Promise(
                            (resolve: (model: SModelRoot) => void, reject: (model: SModelRoot) => void) => {
                                this.logger.log('CommandStack: execute', command)
                                const context: CommandExecutionContext = {
                                    modelChanged: this,
                                    modelFactory: this.modelFactory,
                                    duration: this.defaultDuration,
                                    root: model
                                }
                                const modelOrPromise = command.execute(model, context)
                                if (modelOrPromise instanceof Promise)
                                    modelOrPromise.then(
                                        newModel => {
                                            this.mergeOrPush(command, context)
                                            resolve(newModel)
                                        }
                                    )
                                else {
                                    this.mergeOrPush(command, context)
                                    resolve(modelOrPromise)
                                }
                            })
                    })
            }
        )
        this.currentPromise.then(
            model => this.update(model)
        )
    }

    private mergeOrPush(command: Command, context: CommandExecutionContext) {
        if (this.undoStack.length > 0) {
            const lastCommand = this.undoStack[this.undoStack.length - 1]
            if (!lastCommand.merge(command, context)) {
                this.undoStack.push(command)
            }
        } else {
            if (command.isPushable())
                this.undoStack.push(command)
        }
        if (command.isPushable())
            this.redoStack = []
    }

    undo() {
        this.currentPromise = this.currentPromise.then(
            model => {
                return new Promise(
                    (resolve: (model: SModelRoot) => void, reject: (model: SModelRoot) => void) => {
                        const command = this.undoStack.pop()
                        if (command === undefined) {
                            resolve(model)
                        } else {
                            const context: CommandExecutionContext = {
                                modelChanged: this,
                                modelFactory: this.modelFactory,
                                duration: this.defaultDuration,
                                root: model
                            }
                            const modelOrPromise = command.undo(model, context)
                            if (modelOrPromise instanceof Promise)
                                modelOrPromise.then(
                                    newModel => {
                                        this.redoStack.push(command)
                                        resolve(newModel)
                                    }
                                )
                            else {
                                this.redoStack.push(command)
                                resolve(modelOrPromise)
                            }
                        }
                    })
            }
        )
        this.currentPromise.then(
            model => this.update(model)
        )
    }

    redo() {
        this.currentPromise = this.currentPromise.then(
            model => {
                return new Promise(
                    (resolve: (model: SModelRoot) => void, reject: (model: SModelRoot) => void) => {
                        const command = this.redoStack.pop()
                        if (command === undefined) {
                            resolve(model)
                        } else {
                            const context: CommandExecutionContext = {
                                modelChanged: this,
                                modelFactory: this.modelFactory,
                                duration: this.defaultDuration,
                                root: model
                            }
                            const modelOrPromise = command.redo(model, context)
                            if (modelOrPromise instanceof Promise)
                                modelOrPromise.then(
                                    newModel => {
                                        this.undoStack.push(command)
                                        resolve(newModel)
                                    }
                                )
                            else {
                                this.undoStack.push(command)
                                resolve(modelOrPromise)
                            }
                        }
                    })
            }
        )
        this.currentPromise.then(
            model => this.update(model)
        )
    }

    update(model: SModelRoot) {
        this.viewer.update(model)
    }
}

export type CommandStackProvider = () => Promise<CommandStack>
