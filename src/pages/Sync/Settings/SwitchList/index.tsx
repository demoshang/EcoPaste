import { ClipboardType } from "@/types/store";
import { Flex, Select, Switch } from "antd";
import type { DefaultOptionType } from "antd/es/select";

type SwitchListValue = [boolean, ClipboardType[]];

const SwitchList = ({
  value,
  onChange,
}: {
  value: SwitchListValue;
  onChange: (v: SwitchListValue) => void;
}) => {
  const [switchValue, selectValue] = value;

  const options: DefaultOptionType[] = [
    "text",
    "html",
    "rtf",
    "files",
    "image",
  ].map((item) => {
    return {
      label: item,
      value: item,
    };
  });

  return (
    <Flex align="center" gap="small">
      <Switch
        value={switchValue}
        onChange={(value) => {
          onChange([value, selectValue]);
        }}
      />

      <Select
        disabled={!switchValue}
        style={{ width: "200px" }}
        mode="multiple"
        showSearch={false}
        options={options}
        value={selectValue}
        onChange={(value) => {
          onChange([switchValue, value]);
        }}
      />
    </Flex>
  );
};

export default SwitchList;
