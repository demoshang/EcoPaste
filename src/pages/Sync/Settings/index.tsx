import ProList from "@/components/ProList";
import ProListItem from "@/components/ProListItem";
import ProShortcut from "@/components/ProShortcut";
import ProSwitch from "@/components/ProSwitch";
import { Button, Input, InputNumber, message, Space } from "antd";
import { useSnapshot } from "valtio";
import SwitchList from "./SwitchList";
import { nanoid } from "nanoid";

const SyncSettings = () => {
  const { sync } = useSnapshot(globalStore);
  const { t } = useTranslation();

  return (
    <ProList header={t("sync.title")}>
      <ProListItem
        title={t("sync.label.server_address")}
        description={t("sync.hints.server_address")}
      >
        <Input
          type="text"
          className="w-260"
          value={sync.serverAddress}
          onChange={(e) => {
            globalStore.sync.serverAddress = e.target.value;
          }}
        />
      </ProListItem>

      <ProListItem
        title={t("sync.label.room_id")}
        description={t("sync.hints.room_id")}
      >
        <Space.Compact style={{ width: "100%" }}>
          <Input
            type="text"
            className="w-136"
            value={sync.roomId}
            onChange={(e) => {
              globalStore.sync.roomId = e.target.value;
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              globalStore.sync.roomId = nanoid();
            }}
          >
            {t("sync.label.client_name_generate")}
          </Button>
          <Button
            type="default"
            onClick={() => {
              writeText(globalStore.sync.roomId);
              message.success(t("sync.hints.copy_success"));
            }}
          >
            {t("sync.label.client_name_copy")}
          </Button>
        </Space.Compact>
      </ProListItem>

      <ProListItem
        title={t("sync.label.secret")}
        description={t("sync.hints.secret")}
      >
        <Input
          type="text"
          className="w-260"
          value={sync.secret}
          onChange={(e) => {
            globalStore.sync.secret = e.target.value;
          }}
        />
      </ProListItem>

      <ProShortcut
        title={t("sync.label.upload")}
        value={sync.upload}
        onChange={(value) => {
          globalStore.sync.upload = value;
        }}
      />

      <ProShortcut
        title={t("sync.label.download")}
        value={sync.download}
        onChange={(value) => {
          globalStore.sync.download = value;
        }}
      />

      <ProShortcut
        title={t("sync.label.download_and_paste")}
        value={sync.downloadAndPaste}
        onChange={(value) => {
          globalStore.sync.downloadAndPaste = value;
        }}
      />

      <ProSwitch
        title={t("sync.label.enable_upload_tooltip")}
        value={sync.enableUploadTooltip}
        onChange={(value) => {
          globalStore.sync.enableUploadTooltip = value;
        }}
      />

      <ProSwitch
        title={t("sync.label.enable_download_tooltip")}
        value={sync.enableDownloadTooltip}
        onChange={(value) => {
          globalStore.sync.enableDownloadTooltip = value;
        }}
      />

      <ProListItem
        title={t("sync.label.enable_auto_upload")}
        description={t("sync.hints.enable_auto_upload")}
      >
        <SwitchList
          value={[sync.enableAutoUpload, [...sync.autoUploadType]]}
          onChange={([s, l]) => {
            globalStore.sync.enableAutoUpload = s;
            globalStore.sync.autoUploadType = l;
          }}
        />
      </ProListItem>

      <ProListItem
        title={t("sync.label.auto_upload_size")}
        description={t("sync.hints.auto_upload_size")}
      >
        <InputNumber
          min={0}
          className="w-130"
          disabled={!sync.enableAutoUpload}
          value={sync.autoUploadSize}
          addonAfter="M"
          onChange={(value) => {
            globalStore.sync.autoUploadSize = value ?? 0;
          }}
        />
      </ProListItem>

      <ProListItem
        title={t("sync.label.enable_auto_download")}
        description={t("sync.hints.enable_auto_download")}
      >
        <SwitchList
          value={[sync.enableAutoDownload, [...sync.audoDownloadType]]}
          onChange={([s, l]) => {
            globalStore.sync.enableAutoDownload = s;
            globalStore.sync.audoDownloadType = l;
          }}
        />
      </ProListItem>

      <ProListItem
        title={t("sync.label.auto_download_size")}
        description={t("sync.hints.auto_download_size")}
      >
        <InputNumber
          min={0}
          className="w-130"
          disabled={!sync.enableAutoDownload}
          value={sync.autoDownloadSize}
          addonAfter="M"
          onChange={(value) => {
            globalStore.sync.autoDownloadSize = value ?? 0;
          }}
        />
      </ProListItem>
    </ProList>
  );
};

export default SyncSettings;
