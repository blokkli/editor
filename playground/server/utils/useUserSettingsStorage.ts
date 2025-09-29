import { createStorage, type Storage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

const storage = createStorage({
  driver: fsDriver({ base: "./storage" })
});

export function useUserSettingsStorage(): Storage {
  return storage
}
