import "reflect-metadata";
import {container} from "tsyringe";
import {FileSystem, IFileSystem} from "../FileSystem/FileSystem";
import {Runner, IRunner} from "../Runner/Runner";
import {IMongo, Mongo} from "../Mongo/Mongo";
import {Logger, ILogger} from "../Logger/Logger";

container.registerSingleton<ILogger>("ILogger", Logger);

container.register<IFileSystem>("IFileSystem", {
	useClass: FileSystem,
});

container.register<IRunner>("IRunner", {
	useClass: Runner,
});

container.register<IMongo>("IMongo", {
	useClass: Mongo,
});

export {container};
