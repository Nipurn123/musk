import { DirectFileOutput, EgressInfo, EncodedFileOutput, EncodingOptions, EncodingOptionsPreset, SegmentedFileOutput, StreamOutput } from './proto/livekit_egress';
import ServiceBase from './ServiceBase';
export interface RoomCompositeOptions {
    /**
     * egress layout. optional
     */
    layout?: string;
    /**
     * encoding options or preset. optional
     */
    encodingOptions?: EncodingOptionsPreset | EncodingOptions;
    /**
     * record audio only. optional
     */
    audioOnly?: boolean;
    /**
     * record video only. optional
     */
    videoOnly?: boolean;
    /**
     * custom template url. optional
     */
    customBaseUrl?: string;
}
export interface WebOptions {
    /**
     * encoding options or preset. optional
     */
    encodingOptions?: EncodingOptionsPreset | EncodingOptions;
    /**
     * record audio only. optional
     */
    audioOnly?: boolean;
    /**
     * record video only. optional
     */
    videoOnly?: boolean;
}
export interface TrackCompositeOptions {
    /**
     * audio track ID
     */
    audioTrackId?: string;
    /**
     * video track ID
     */
    videoTrackId?: string;
    /**
     * encoding options or preset. optional
     */
    encodingOptions?: EncodingOptionsPreset | EncodingOptions;
}
/**
 * Used to supply multiple outputs with an egress request
 */
export interface EncodedOutputs {
    file?: EncodedFileOutput | undefined;
    stream?: StreamOutput | undefined;
    segments?: SegmentedFileOutput | undefined;
}
/**
 * Client to access Egress APIs
 */
export declare class EgressClient extends ServiceBase {
    private readonly rpc;
    /**
     * @param host hostname including protocol. i.e. 'https://cluster.livekit.io'
     * @param apiKey API Key, can be set in env var LIVEKIT_API_KEY
     * @param secret API Secret, can be set in env var LIVEKIT_API_SECRET
     */
    constructor(host: string, apiKey?: string, secret?: string);
    /**
     * @param roomName room name
     * @param output file or stream output
     * @param opts RoomCompositeOptions
     */
    startRoomCompositeEgress(roomName: string, output: EncodedOutputs | EncodedFileOutput | StreamOutput | SegmentedFileOutput, opts?: RoomCompositeOptions): Promise<EgressInfo>;
    /**
     * @deprecated use RoomCompositeOptions instead
     */
    startRoomCompositeEgress(roomName: string, output: EncodedOutputs | EncodedFileOutput | StreamOutput | SegmentedFileOutput, layout?: string, options?: EncodingOptionsPreset | EncodingOptions, audioOnly?: boolean, videoOnly?: boolean, customBaseUrl?: string): Promise<EgressInfo>;
    /**
     * @param url url
     * @param output file or stream output
     * @param opts WebOptions
     */
    startWebEgress(url: string, output: EncodedOutputs | EncodedFileOutput | StreamOutput | SegmentedFileOutput, opts?: WebOptions): Promise<EgressInfo>;
    /**
     * @param roomName room name
     * @param output file or stream output
     * @param opts TrackCompositeOptions
     */
    startTrackCompositeEgress(roomName: string, output: EncodedOutputs | EncodedFileOutput | StreamOutput | SegmentedFileOutput, opts?: TrackCompositeOptions): Promise<EgressInfo>;
    /**
     * @deprecated use TrackCompositeOptions instead
     */
    startTrackCompositeEgress(roomName: string, output: EncodedOutputs | EncodedFileOutput | StreamOutput | SegmentedFileOutput, audioTrackId?: string, videoTrackId?: string, options?: EncodingOptionsPreset | EncodingOptions): Promise<EgressInfo>;
    private isEncodedOutputs;
    private isEncodedFileOutput;
    private isSegmentedFileOutput;
    private isStreamOutput;
    private getOutputParams;
    /**
     * @param roomName room name
     * @param output file or websocket output
     * @param trackId track Id
     */
    startTrackEgress(roomName: string, output: DirectFileOutput | string, trackId: string): Promise<EgressInfo>;
    /**
     * @param egressId
     * @param layout
     */
    updateLayout(egressId: string, layout: string): Promise<EgressInfo>;
    /**
     * @param egressId
     * @param addOutputUrls
     * @param removeOutputUrls
     */
    updateStream(egressId: string, addOutputUrls?: string[], removeOutputUrls?: string[]): Promise<EgressInfo>;
    /**
     * @param roomName list egress for one room only
     */
    listEgress(roomName?: string): Promise<Array<EgressInfo>>;
    /**
     * @param egressId
     */
    stopEgress(egressId: string): Promise<EgressInfo>;
}
