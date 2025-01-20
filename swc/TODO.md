Use these to get the parse-data and imports, and allow these to be added as `?plugins=` (comma-separated)

```
import { getTypescriptFileData } from "../swc/getTypescriptFileData";
import { trySwcParseFile } from "../swc/trySwcParseFile";
```

Be sure to only apply it on typescript/javascript. Maybe I can make similar parse-data and imports for other major programming langauges at a later point. These plugins should be packages at some point, so others can easily make them for other purposes too.
