import { Stream } from "stream";

export interface BaseFileService<TResult> {
    read(stream: Stream): Promise<TResult[]>;
}