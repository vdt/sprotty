/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable } from "inversify"
import { TYPES } from "../../base/types"
import { ILogger } from '../../utils/logging'
import { InstanceRegistry } from "../../utils/registry"
import { Bounds, EMPTY_BOUNDS } from "../../utils/geometry"
import { SParentElement, SModelElement } from "../../base/model/smodel"
import { isLayouting, Layouting } from "./model"
import { BoundsData } from "./hidden-bounds-updater"
import { VBoxLayouter } from "./vbox-layout"

export class LayoutRegistry extends InstanceRegistry<ILayout> {
    constructor() {
        super()
        this.register(VBoxLayouter.KIND, new VBoxLayouter())
    }
}

@injectable()
export class Layouter {

    constructor(@inject(TYPES.LayoutRegistry) protected layoutRegistry: LayoutRegistry,
                @inject(TYPES.ILogger) protected logger: ILogger) {}

    layout(element2boundsData: Map<SModelElement​​ , BoundsData>) {
        new StatefulLayouter(element2boundsData, this.layoutRegistry, this.logger).layout()
    }
}

export class StatefulLayouter {

    private toBeLayouted: (SParentElement & Layouting)[]

    constructor(private readonly element2boundsData: Map<SModelElement​​ , BoundsData>,
                private readonly layoutRegistry: LayoutRegistry,
                public readonly log: ILogger) {
        this.toBeLayouted = []
        element2boundsData.forEach(
            (data, element) => {
                if (isLayouting(element))
                    this.toBeLayouted.push(element)
            })
    }

    getBoundsData(element: SModelElement): BoundsData {
        let boundsData = this.element2boundsData.get(element)
        let bounds = (element as any).bounds
        if (isLayouting(element) && this.toBeLayouted.indexOf(element) >= 0) {
            bounds = this.doLayout(element)
        }
        if (!boundsData) {
            boundsData = {
                bounds: bounds,
                boundsChanged: false
            }
            this.element2boundsData.set(element, boundsData)
        }
        return boundsData
    }

    layout(): void {
        while (this.toBeLayouted.length > 0) {
            const element = this.toBeLayouted[0]
            this.doLayout(element)
        }
    }

    protected doLayout(element: SParentElement & Layouting): Bounds {
        const index = this.toBeLayouted.indexOf(element)
        if (index >= 0)
            this.toBeLayouted.splice(index, 1)
        const layout = this.layoutRegistry.get(element.layout)
        if (layout)
            layout.layout(element, this)
        const boundsData = this.element2boundsData.get(element)
        if (boundsData !== undefined && boundsData.bounds !== undefined) {
            return boundsData.bounds
        } else {
            this.log.error(element, 'Layout failed')
            return EMPTY_BOUNDS
        }
    }
}

export interface ILayout {
    layout(container: Layouting & SParentElement,
           layouter: StatefulLayouter): void
}

