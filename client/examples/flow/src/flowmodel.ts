/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { SNode, SNodeSchema, Bounds, moveFeature } from "../../../src"

export interface TaskNodeSchema extends SNodeSchema {
    name?: string
    status?: string
    kernelNr: number
}

export class TaskNode extends SNode implements TaskNodeSchema {
    name: string = ''
    status?: string
    kernelNr: number

    hasFeature(feature: symbol): boolean {
        if (feature === moveFeature)
            return false
        else
            return super.hasFeature(feature)
    }
}

export interface BarrierNodeSchema extends SNodeSchema {
    name: string
}

export class BarrierNode extends SNode implements BarrierNodeSchema {
    name: string = ''
    bounds: Bounds = { x: 0, y: 0, width: 50, height: 20 }

    hasFeature(feature: symbol): boolean {
        if (feature === moveFeature)
            return false
        else
            return super.hasFeature(feature)
    }
}
