## Overview

The `assistant` feature implements an [Add Action](/plugins/add-action) that can
be dragged anywhere on the page. Once placed, a modal overlay is shown with a
basic prompt textarea, where the user can enter a prompt. Clicking on _Generate_
calls the [adapter.assistantGetResults] method which is expected to return the
content that should be generated.
